using System.Text;
using DMS.Api.Authentication;
using DMS.Api.Authorization;
using DMS.Api.BackgroundJobs;
using DMS.Api.Data;
using DMS.Api.Middleware;
using DMS.Api.Services;
using DMS.Api.Storage.Factory;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
builder.Host.UseSerilog((ctx, lc) => lc
    .WriteTo.Console()
    .WriteTo.File("Logs/dms-api-.log", rollingInterval: RollingInterval.Day));

// Services Registration
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();

// Entity Framework & SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<DmsDbContext>(options =>
    options.UseSqlServer(connectionString));

// Core Domain Services
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<IStorageProviderFactory, StorageProviderFactory>();
builder.Services.AddScoped<IStorageRoutingService, StorageRoutingService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IFolderService, FolderService>();
builder.Services.AddScoped<IStorageMigrationService, StorageMigrationService>();
builder.Services.AddScoped<IFilePolicyValidator, FilePolicyValidator>();
builder.Services.AddScoped<IIdempotencyService, IdempotencyService>();
builder.Services.AddScoped<IConfigSettingsService, ConfigSettingsService>();
builder.Services.AddScoped<IFirebaseNotificationService, FirebaseNotificationService>();

// High-Throughput Channels & Background Hosted Services
builder.Services.AddSingleton<IAuditLogger, AuditLogger>();
builder.Services.AddSingleton<IWebhookDispatcher, WebhookDispatcher>();
builder.Services.AddHostedService<AuditLogChannelProcessor>();
builder.Services.AddHostedService<WebhookDeliveryBackgroundService>();
builder.Services.AddHostedService<StorageMigrationBackgroundService>();

IServiceProvider? appScopeProvider = null;

// JWT Authentication with Query Token Support & Strict Database Key Resolution
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var tokenStr = context.Request.Query["token"].ToString();
            if (!string.IsNullOrWhiteSpace(tokenStr))
            {
                context.Token = tokenStr;
            }
            return Task.CompletedTask;
        }
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKeyResolver = (token, securityToken, kid, validationParameters) =>
        {
            if (appScopeProvider == null)
            {
                throw new InvalidOperationException("Application service provider is not yet initialized.");
            }

            using var scope = appScopeProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<DmsDbContext>();
            var dbSetting = db.ConfigSettings
                .AsNoTracking()
                .FirstOrDefault(c => c.SettingKey == "Jwt.SecretKey" && c.IsActive);

            if (string.IsNullOrWhiteSpace(dbSetting?.SettingValue))
            {
                throw new InvalidOperationException("Jwt.SecretKey is missing or inactive in ConfigSettings database table.");
            }

            return new[] { new SymmetricSecurityKey(Encoding.UTF8.GetBytes(dbSetting.SettingValue)) };
        }
    };
});

// Swagger OpenAPI with Security Definitions
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Multi-Tenant Enterprise DMS API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p => p
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

var app = builder.Build();
appScopeProvider = app.Services;

// Database Migration & Seed on Startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<DmsDbContext>();
    await DbInitializer.SeedAsync(dbContext);
}

// Pipeline Configuration
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "DMS API v1"));
}

app.UseCors("AllowAll");
app.UseMiddleware<TenantResolverMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

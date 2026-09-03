# Step 1: Use .NET 10.0 SDK to build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/out

# Step 2: Use .NET 10.0 Runtime to run
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/out ./

# 🔴 FIX FOR EXIT CODE 139 (SIGSEGV CRASH):
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

# Configure port for Render
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "DMS.Api.dll"]
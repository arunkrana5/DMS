# Step 1: Use .NET 10.0 SDK to build the API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy all project code and publish
COPY . ./
RUN dotnet publish -c Release -o /app/out

# Step 2: Use .NET 10.0 Runtime to run the API
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Copy compiled files from build stage
COPY --from=build /app/out ./

# Configure port 8080 for Render
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "DMS.Api.dll"]
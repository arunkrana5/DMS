# Step 1: Use Microsoft .NET 8 SDK to build the API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy all project code and publish to /app/out
COPY . ./
RUN dotnet publish -c Release -o /app/out

# Step 2: Use Microsoft .NET 8 Runtime to run the API
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy compiled files from build stage
COPY --from=build /app/out ./

# Configure port 8080 for Render
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Start your API (Replace DMS.API.dll if your project name is different)
ENTRYPOINT ["dotnet", "DMS.API.dll"]
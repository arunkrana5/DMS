# Step 1: Build .NET 10 API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/out

# Step 2: Runtime Environment
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# 🛠️ INSTALL ICU GLOBALIZATION FOR SQL SERVER:
RUN apt-get update && apt-get install -y libicu-dev

COPY --from=build /app/out ./

# 🛠️ DISABLE INOTIFY FILE WATCHER CRASH:
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENV ASPNETCORE_hostBuilder__reloadConfigOnChange=false

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "DMS.Api.dll"]
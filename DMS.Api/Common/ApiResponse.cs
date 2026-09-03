namespace DMS.Api.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public string? ErrorCode { get; set; }
    public List<string> Errors { get; set; } = new();

    public static ApiResponse<T> Ok(T data, string message = "Operation completed successfully.")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data
        };
    }

    public static ApiResponse<T> Fail(string errorCode, string message, List<string>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            ErrorCode = errorCode,
            Message = message,
            Errors = errors ?? new List<string>()
        };
    }
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse Ok(string message = "Operation completed successfully.")
    {
        return new ApiResponse
        {
            Success = true,
            Message = message,
            Data = null
        };
    }

    public static new ApiResponse Fail(string errorCode, string message, List<string>? errors = null)
    {
        return new ApiResponse
        {
            Success = false,
            ErrorCode = errorCode,
            Message = message,
            Errors = errors ?? new List<string>()
        };
    }
}

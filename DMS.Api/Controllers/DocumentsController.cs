using DMS.Api.Common;
using DMS.Api.DTOs;
using DMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DMS.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documentService;

    public DocumentsController(IDocumentService documentService)
    {
        _documentService = documentService;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument([FromForm] UploadDocumentRequest request, IFormFile file, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse.Fail(ErrorCodes.InvalidFile, "No file provided for upload."));
        }

        await using var stream = file.OpenReadStream();
        var result = await _documentService.UploadDocumentAsync(request, stream, file.FileName, file.ContentType, file.Length, idempotencyKey, cancellationToken);

        return CreatedAtAction(nameof(GetDocumentByPublicId), new { publicId = result.PublicId }, ApiResponse<DocumentDto>.Ok(result, "Document uploaded successfully."));
    }

    [HttpPost("upload-batch")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadBatch([FromForm] BatchUploadRequest request, CancellationToken cancellationToken)
    {
        if (request.Files == null || request.Files.Count == 0)
        {
            return BadRequest(ApiResponse.Fail(ErrorCodes.InvalidFile, "No files provided for batch upload."));
        }

        var items = new List<(UploadDocumentRequest Request, Stream Stream, string FileName, string ContentType, long FileSize)>();

        for (int i = 0; i < request.Files.Count; i++)
        {
            var file = request.Files[i];
            var typeCode = request.DocumentTypeCodes != null && i < request.DocumentTypeCodes.Count ? request.DocumentTypeCodes[i] : null;

            var singleReq = new UploadDocumentRequest
            {
                TenantId = request.TenantId,
                ApplicationId = request.ApplicationId,
                ModuleCode = request.ModuleCode,
                EntityType = request.EntityType,
                EntityId = request.EntityId,
                DocumentTypeCode = typeCode,
                Description = request.Description
            };

            items.Add((singleReq, file.OpenReadStream(), file.FileName, file.ContentType, file.Length));
        }

        try
        {
            var results = await _documentService.UploadBatchDocumentsAsync(items, cancellationToken);
            return Ok(ApiResponse<List<DocumentDto>>.Ok(results, $"Option A Atomic Upload Successful: Saved {results.Count} mandatory & optional documents into storage."));
        }
        catch (BadHttpRequestException ex)
        {
            return BadRequest(ApiResponse.Fail(ErrorCodes.MandatoryDocumentMissing, ex.Message));
        }
    }

    [HttpPost("bulk-upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> BulkUpload([FromForm] UploadDocumentRequest request, List<IFormFile> files, CancellationToken cancellationToken)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest(ApiResponse.Fail(ErrorCodes.InvalidFile, "No files provided for bulk upload."));
        }

        var result = new BulkUploadResultDto { TotalSubmitted = files.Count };

        foreach (var file in files)
        {
            try
            {
                await using var stream = file.OpenReadStream();
                var docDto = await _documentService.UploadDocumentAsync(request, stream, file.FileName, file.ContentType, file.Length, null, cancellationToken);
                result.TotalSucceeded++;
                result.Results.Add(new BulkUploadItemResult
                {
                    FileName = file.FileName,
                    Success = true,
                    Document = docDto
                });
            }
            catch (Exception ex)
            {
                result.TotalFailed++;
                result.Results.Add(new BulkUploadItemResult
                {
                    FileName = file.FileName,
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }
        }

        return Ok(ApiResponse<BulkUploadResultDto>.Ok(result, "Bulk upload completed."));
    }

    [HttpPost("bulk-register")]
    public async Task<IActionResult> BulkRegister([FromBody] List<BulkRegisterItemRequest> requests, CancellationToken cancellationToken)
    {
        if (requests == null || requests.Count == 0)
        {
            return BadRequest(ApiResponse.Fail(ErrorCodes.InvalidFile, "No items provided for bulk registration."));
        }

        var result = await _documentService.BulkRegisterAsync(requests, cancellationToken);
        return Ok(ApiResponse<BulkUploadResultDto>.Ok(result, "Bulk registration completed."));
    }

    [HttpGet]
    [HttpGet("search")]
    public async Task<IActionResult> SearchDocuments([FromQuery] DocumentSearchRequest request, CancellationToken cancellationToken)
    {
        var pagedResult = await _documentService.SearchDocumentsAsync(request, cancellationToken);
        return Ok(ApiResponse<PagedResult<DocumentDto>>.Ok(pagedResult));
    }

    [HttpGet("{publicId}")]
    public async Task<IActionResult> GetDocumentByPublicId(string publicId, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(publicId, out var g)) return BadRequest(ApiResponse.Fail("DMS001", "Invalid Document Public ID."));
        var doc = await _documentService.GetByPublicIdAsync(g, cancellationToken);
        if (doc == null)
        {
            return NotFound(ApiResponse.Fail(ErrorCodes.DocumentNotFound, $"Document '{publicId}' not found."));
        }
        return Ok(ApiResponse<DocumentDto>.Ok(doc));
    }

    [HttpGet("{publicId}/download")]
    public async Task<IActionResult> DownloadDocument(string publicId, [FromQuery] int? versionNumber, CancellationToken cancellationToken)
    {
        try
        {
            if (!Guid.TryParse(publicId, out var g)) return BadRequest(ApiResponse.Fail("DMS001", "Invalid Document Public ID."));
            var (stream, contentType, fileName) = await _documentService.DownloadDocumentAsync(g, versionNumber, cancellationToken);
            return File(stream, contentType, fileName, enableRangeProcessing: true);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse.Fail(ErrorCodes.DocumentNotFound, $"Document '{publicId}' not found."));
        }
    }

    [HttpGet("{publicId}/preview")]
    public async Task<IActionResult> PreviewDocument(string publicId, [FromQuery] int? versionNumber, CancellationToken cancellationToken)
    {
        try
        {
            if (!Guid.TryParse(publicId, out var g)) return BadRequest(ApiResponse.Fail("DMS001", "Invalid Document Public ID."));
            var (stream, contentType, fileName) = await _documentService.DownloadDocumentAsync(g, versionNumber, cancellationToken);
            
            var resolvedContentType = GetPreviewContentType(fileName, contentType);

            Response.Headers.ContentDisposition = new Microsoft.Net.Http.Headers.ContentDispositionHeaderValue("inline")
            {
                FileName = fileName
            }.ToString();

            return File(stream, resolvedContentType, enableRangeProcessing: true);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse.Fail(ErrorCodes.DocumentNotFound, $"Document '{publicId}' not found."));
        }
    }

    private static string GetPreviewContentType(string fileName, string defaultType)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            ".txt" or ".log" or ".json" or ".csv" or ".xml" => "text/plain; charset=utf-8",
            ".html" or ".htm" => "text/html",
            _ => string.IsNullOrWhiteSpace(defaultType) || defaultType == "application/octet-stream" ? "application/octet-stream" : defaultType
        };
    }

    [HttpPost("{publicId:guid}/versions")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateVersion(Guid publicId, IFormFile file, [FromForm] string? remarks, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse.Fail(ErrorCodes.InvalidFile, "No file provided for version creation."));
        }

        await using var stream = file.OpenReadStream();
        var version = await _documentService.CreateVersionAsync(publicId, stream, file.FileName, file.ContentType, file.Length, remarks, cancellationToken);

        return Ok(ApiResponse<DocumentVersionDto>.Ok(version, "Document version created successfully."));
    }

    [HttpPut("{publicId}")]
    public async Task<IActionResult> UpdateDocument(string publicId, [FromBody] UpdateDocumentRequest request, CancellationToken cancellationToken)
    {
        try
        {
            if (!Guid.TryParse(publicId, out var g)) return BadRequest(ApiResponse.Fail("DMS001", "Invalid Document Public ID."));
            var result = await _documentService.UpdateDocumentAsync(g, request, cancellationToken);
            return Ok(ApiResponse<DocumentDto>.Ok(result, "Document metadata updated successfully."));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(ApiResponse.Fail(ErrorCodes.DocumentNotFound, $"Document '{publicId}' not found."));
        }
    }

    [HttpDelete("{publicId}")]
    public async Task<IActionResult> DeleteDocument(string publicId, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(publicId, out var g)) return BadRequest(ApiResponse.Fail("DMS001", "Invalid Document Public ID."));
        await _documentService.SoftDeleteDocumentAsync(g, cancellationToken);
        return Ok(ApiResponse.Ok("Document soft-deleted successfully."));
    }

    [HttpPost("{publicId}/restore")]
    public async Task<IActionResult> RestoreDocument(string publicId, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(publicId, out var g)) return BadRequest(ApiResponse.Fail("DMS001", "Invalid Document Public ID."));
        await _documentService.RestoreDocumentAsync(g, cancellationToken);
        return Ok(ApiResponse.Ok("Document restored successfully."));
    }
}

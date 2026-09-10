using Microsoft.AspNetCore.Identity;

namespace DMS.Api.Authentication;

public static class PasswordSecurityService
{
    private static readonly PasswordHasher<object> _hasher = new();
    private static readonly object _dummyUser = new();

    /// <summary>
    /// Hashes a plain-text password using cryptographically secure PBKDF2 with HMAC-SHA256 and a random salt.
    /// </summary>
    public static string HashPassword(string plainPassword)
    {
        if (string.IsNullOrWhiteSpace(plainPassword)) return string.Empty;
        return _hasher.HashPassword(_dummyUser, plainPassword.Trim());
    }

    /// <summary>
    /// Verifies a provided password against the stored password hash.
    /// Supports automatic rehash upgrade if the stored password uses a legacy hash or plain-text representation.
    /// </summary>
    public static bool VerifyPassword(string storedHash, string providedPassword, out bool rehashNeeded)
    {
        rehashNeeded = false;
        if (string.IsNullOrWhiteSpace(storedHash) || string.IsNullOrWhiteSpace(providedPassword))
            return false;

        var cleanProvided = providedPassword.Trim();

        try
        {
            // 1. Standard PBKDF2 verification via ASP.NET Core PasswordHasher
            var result = _hasher.VerifyHashedPassword(_dummyUser, storedHash, cleanProvided);
            if (result == PasswordVerificationResult.Success)
            {
                return true;
            }
            if (result == PasswordVerificationResult.SuccessRehashNeeded)
            {
                rehashNeeded = true;
                return true;
            }
        }
        catch
        {
            // If storedHash is not a valid PBKDF2 format, proceed to legacy check
        }

        // 2. Legacy Plain-Text Match Fallback (for old database records before hashing upgrade)
        if (string.Equals(storedHash, cleanProvided, StringComparison.Ordinal))
        {
            rehashNeeded = true; // Auto-upgrade to PBKDF2 salted hash upon successful login
            return true;
        }

        return false;
    }
}

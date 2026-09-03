using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.Api.Entities;

public abstract class BaseEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    public Guid PublicId { get; set; } = Guid.NewGuid();

    public bool IsActive { get; set; } = true;
    public int? Priority { get; set; }
    public bool IsDeleted { get; set; } = false;
    public int? DeletedBy { get; set; }
    public DateTime? DeletedDate { get; set; }
    public int CreatedBy { get; set; } = 1;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedDate { get; set; }
    public int? ModifiedBy { get; set; }

    [MaxLength(50)]
    public string? IPAddress { get; set; }
}

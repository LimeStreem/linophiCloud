using linophi.Models;
using LinophiWeb.Utility.Configuration;
using Microsoft.AspNet.Identity.EntityFramework;

namespace LinophiWeb.Models
{
    public class ApplicationDbContext : IdentityDbContext<UserAccount>
    {
        public ApplicationDbContext()
            : base(ConfigurationLoaderFactory.GetConfigurationLoader().GetConfiguration("SQL-ConnectionString"), throwIfV1Schema: false)
        {
        }

        public static ApplicationDbContext Create()
        {
            return new ApplicationDbContext();
        }
    }
}
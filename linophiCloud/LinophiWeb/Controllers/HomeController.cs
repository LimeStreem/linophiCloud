
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace LinophiWeb.Controllers
{
    public class HomeController : Controller
    {
        // GET: Home
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult AfterLogin()
        {
            return View();
        }

        public ActionResult Search()
        {
            return View();
        }

        public ActionResult NewArticle()
        {
            return View();
        }

        public ActionResult PrivacyPolicy()
        {
            return View();
        }

        public ActionResult Terms()
        {
            return View();
        }

        public ActionResult About()
        {
            return View();
        }

        public ActionResult Developer()
        {
            return View();
        }
    }
}
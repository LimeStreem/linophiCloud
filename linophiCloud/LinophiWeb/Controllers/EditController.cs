using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace LinophiWeb.Controllers
{
    public class EditController : Controller
    {
        // GET: Edit
        public ActionResult Index()
        {
            return View("Editor");
        }

        //ObiEditorを読み込む
        public ActionResult ObiEdit()
        {
            return View("ObiEdit");
        }
    }
}
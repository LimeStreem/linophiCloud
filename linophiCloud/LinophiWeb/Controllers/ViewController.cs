﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace LinophiWeb.Controllers
{
    public class ViewController : Controller
    {
        // GET: View
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult AfterRead()
        {
            return View();
        }


    }
}
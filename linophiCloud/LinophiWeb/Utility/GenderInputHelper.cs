using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Microsoft.Data.OData.Query.SemanticAst;

namespace LinophiWeb.Utility
{
    public class GenderInputHelper
    {
        public static IEnumerable<SelectListItem> getGenderInput()
        {
            yield return new SelectListItem() {Text = "男", Value = "1"};
            yield return new SelectListItem() {Text = "女", Value = "2"};
            yield return new SelectListItem() {Text = "--",Value = "0",Selected = true};
        }
    }
}
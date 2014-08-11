// ***********************************************************************
// Assembly         : LinophiWeb
// Author           : Lime
// Created          : 08-12-2014
//
// Last Modified By : Lime
// Last Modified On : 08-12-2014
// ***********************************************************************
// <copyright file="Startup.cs" company="beep">
//     Copyright (c) . All rights reserved.
// </copyright>
// <summary>Owinスタートアップクラス</summary>
// ***********************************************************************
using System;
using System.Threading.Tasks;
using Microsoft.Owin;
using Owin;

[assembly: OwinStartup(typeof(LinophiWeb.Startup))]

namespace LinophiWeb
{
    /// <summary>
    /// Class Startup.
    /// </summary>
    public partial class Startup
    {
        /// <summary>
        /// Configurations the specified application.
        /// </summary>
        /// <param name="app">The application.</param>
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}

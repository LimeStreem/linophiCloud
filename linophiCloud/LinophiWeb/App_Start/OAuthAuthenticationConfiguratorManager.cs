using System.Collections.Generic;
using JY.Owin.Security.YahooJapan;
using LinophiWeb.Utility.Configuration;
using Microsoft.Owin;
using Microsoft.Owin.Security.Google;
using Owin;

namespace linophi.Auth
{
    public static class OAuthAuthenticationConfiguratorManager
    {
        public static void ConfigureOAuthentication(IAppBuilder app)
        {
            List<IOAuthAuthenticationConfigurator> configurators =new List<IOAuthAuthenticationConfigurator>()
            {
                new OAuthAuthenticationConfiguratorBase.TwitterOAuthAuthenticationConfigurator(), 
                new OAuthAuthenticationConfiguratorBase.FacebookOAuthAuthenticationConfigurator(), 
/*                new OAuthAuthenticationConfiguratorBase.GoogleOAuthAuthenticationConfigurator(),
                new OAuthAuthenticationConfiguratorBase.YahooJpnOAuthAuthenticationConfigurator(),
                new OAuthAuthenticationConfiguratorBase.GithubOAuthAuthenticationConfigurator(),
                new OAuthAuthenticationConfiguratorBase.MicrosoftOAuthAuthenticationConfigurator()*/
            };
            configurators.ForEach((configurator)=>configurator.ConfigureAuth(app));
        }

        private interface IOAuthAuthenticationConfigurator
        {
            void ConfigureAuth(IAppBuilder app);
        }

        private abstract class OAuthAuthenticationConfiguratorBase:IOAuthAuthenticationConfigurator
        {
            protected IConfigurationLoader ConfigurationLoader=ConfigurationLoaderFactory.GetConfigurationLoader();
            
            public abstract void ConfigureAuth(IAppBuilder app);

            /// <summary>
            /// Twitterのログイン認証
            /// </summary>
            public class TwitterOAuthAuthenticationConfigurator:OAuthAuthenticationConfiguratorBase
            {
                public override void ConfigureAuth(IAppBuilder app)
                {
                    app.UseTwitterAuthentication(consumerKey: ConfigurationLoader.GetConfiguration("Twitter-ConsumerKey"),
                        consumerSecret: ConfigurationLoader.GetConfiguration("Twitter-ConsumerSecret"));
                }
            }

            /// <summary>
            /// フェイスブックのログイン認証
            /// </summary>
            public class FacebookOAuthAuthenticationConfigurator:OAuthAuthenticationConfiguratorBase
            {
                public override void ConfigureAuth(IAppBuilder app)
                {
                    app.UseFacebookAuthentication(appId: ConfigurationLoader.GetConfiguration("Facebook-AppID"),
                        appSecret: ConfigurationLoader.GetConfiguration("Facebook-AppSecret"));
                }
            }

            /// <summary>
            /// Googleのログイン認証
            /// </summary>
            public class GoogleOAuthAuthenticationConfigurator:OAuthAuthenticationConfiguratorBase
            {
                public override void ConfigureAuth(IAppBuilder app)
                {
                    app.UseGoogleAuthentication(new GoogleOAuth2AuthenticationOptions()
                    {
                        ClientId = ConfigurationLoader.GetConfiguration("Google-ClientId"),
                        ClientSecret = ConfigurationLoader.GetConfiguration("Google-ClientSecret"),
                        CallbackPath = new PathString("/Account/ExternalLoginCallbackForGoogle")
                    });
                }
            }

            /// <summary>
            /// YahooJapanのログイン認証
            /// </summary>
            public class YahooJpnOAuthAuthenticationConfigurator:OAuthAuthenticationConfiguratorBase
            {
                public override void ConfigureAuth(IAppBuilder app)
                {
                    app.UseYahooAuthentication(new YahooJpnOAuth2AuthenticationOptions()
                    {
                        ClientId = ConfigurationLoader.GetConfiguration("YahooJpn-AppID"),
                        ClientSecret = ConfigurationLoader.GetConfiguration("YahooJpn-AppSecret"),
                        CallbackPath = new PathString("/Account/ExternalLoginCallbackForYahoo")
                    });
                }
            }
        }
    }
}

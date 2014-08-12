using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using linophi.Models;
using linophi.Utility;
using LinophiWeb.Models;
using LinophiWeb.Utility.Configuration;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin.Security;

namespace LinophiWeb.Controllers
{
    [Authorize]
    public class AccountController : Controller
    {
        private ApplicationUserManager _userManager;

        public AccountController()
        {
        }

        public AccountController(ApplicationUserManager userManager)
        {
            UserManager = userManager;
        }

        public ApplicationUserManager UserManager
        {
            get { return _userManager ?? HttpContext.GetOwinContext().GetUserManager<ApplicationUserManager>(); }
            private set { _userManager = value; }
        }

        // Authorize アクションは、任意の保護された 
        // Web API にアクセスしたときに呼び出されるエンド ポイントです。ユーザーがログインしていない場合は、
        // Login ページに リダイレクトされます。正常にログインすると、Web API を呼び出すことができます。
        [HttpGet]
        public ActionResult Authorize()
        {
            Claim[] claims = new ClaimsPrincipal(User).Claims.ToArray();
            var identity = new ClaimsIdentity(claims, "Bearer");
            AuthenticationManager.SignIn(identity);
            return new EmptyResult();
        }

        [AllowAnonymous]
        public ActionResult SignupDebug()
        {
            return View("ExternalLoginConfirmation");
        }

        //
        // GET: /Account/Login
        //ユーザーによるアクセスによるLoginのコントローラ。
        [AllowAnonymous]
        public ActionResult Login(string returnUrl)
        {
            var loader = ConfigurationLoaderFactory.GetConfigurationLoader();
            if (User.Identity.IsAuthenticated)
            {
                return RedirectToAction("Index", "Home");
            }
            ViewBag.ReturnUrl = returnUrl;
            return RedirectToAction("Index", "Home");//ログインされてなかったとき
        }

        ////
        //// GET: /Account/ConfirmEmail
        //[AllowAnonymous]
        //public async Task<ActionResult> ConfirmEmail(string userId, string code)
        //{
        //    if (userId == null || code == null)
        //    {
        //        return View("Error");
        //    }

        //    IdentityResult result = await UserManager.ConfirmEmailAsync(userId, code);
        //    if (result.Succeeded)
        //    {
        //        return View("ConfirmEmail");
        //    }
        //    AddErrors(result);
        //    return View();
        //}



        //
        // POST: /Account/ExternalLogin
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public ActionResult ExternalLogin(string provider, string returnUrl)
        {
            // 外部ログイン プロバイダーへのリダイレクトを要求します
            //!! Return URLというのは、認証した後に戻るアドレス。  OAuthの定義するCallbackではないということに注意が必要なように思える。
            return new ChallengeResult(provider,
                Url.Action("ExternalLoginCallback", "Account", new { ReturnUrl = returnUrl }));
        }

        //
        // GET: /Account/ExternalLoginCallback
        [AllowAnonymous]
        public ActionResult ExternalLoginCallbackForGoogle(string returnUrl)
        {
            return RedirectToAction("ExternalLoginCallback");
        }

        // GET: /Account/ExternalLoginCallback
        [AllowAnonymous]
        public ActionResult ExternalLoginCallbackForYahoo(string returnUrl)
        {
            return RedirectToAction("ExternalLoginCallback");
        }

        [AllowAnonymous]
        public ActionResult ExternalLoginCallbackForGithub(string returnUrl)
        {
            return RedirectToAction("ExternalLoginCallback");
        }

        [AllowAnonymous]
        public ActionResult ExternalLoginCallbackForMicrosoft(string returnUrl)
        {
            return RedirectToAction("ExternalLoginCallback");
        }

        //
        // GET: /Account/ExternalLoginCallback
        [AllowAnonymous]
        public async Task<ActionResult> ExternalLoginCallback(string returnUrl)
        {

            ExternalLoginInfo loginInfo = await AuthenticationManager.GetExternalLoginInfoAsync();
            //Owin Securityによって提供されるログイン状態の取得。
            if (loginInfo == null) //ログインできなかった場合?(認証トークンの取得失敗)
            {
                return RedirectToAction("Login"); //Loginのページに戻す。
            }

            // ユーザーが既にログインを持っている場合、この外部ログイン プロバイダーを使用してユーザーをサインインします
            UserAccount user = await UserManager.FindAsync(loginInfo.Login);
            if (user != null)
            {
                await SignInAsync(user, false);
                return RedirectToLocal(returnUrl);
            }
            // ユーザーがアカウントを持っていない場合、ユーザーにアカウントを作成するよう求めます
            ViewBag.ReturnUrl = returnUrl;
            ViewBag.LoginProvider = loginInfo.Login.LoginProvider;
            //注)この瞬間に以下のコードはExternalLoginConfirmationアクションを呼び出しているのではない。
            //あくまでもビューをリターンしているに過ぎないことに注意。
            return View("ExternalLoginConfirmation", new ExternalLoginConfirmationViewModel { Email = loginInfo.Email }
                /*フォームのデフォルト値としてメールアドレスをセットするため。*/);
        }



        //
        // POST: /Account/ExternalLoginConfirmation
        //登録していないものの追加データを受け取って保存するためのアクション
        //前提:認証されていない部外者のアクセスであること/ExternalLoginCallbackによるものであること。
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> ExternalLoginConfirmation(ExternalLoginConfirmationViewModel model,
            string returnUrl)
        {
            //ログインしていないはずなので、ISAuthenticated==trueなら何かおかしい。
            if (User.Identity.IsAuthenticated)
            {
                return RedirectToAction("Login");
            }
            if (!model.IsValidated)
            {
                ModelState.AddModelError("", "不正な誕生日の日付です。");
                return View(model);
            }
            if (ModelState.IsValid)
            {
                // 外部ログイン プロバイダーからユーザーに関する情報を取得します
                ExternalLoginInfo info = await AuthenticationManager.GetExternalLoginInfoAsync();
                if (info == null)
                {
                    return View("ExternalLoginFailure");
                }
                //誕生日のパース処理
                DateTime birthDay;
                if (DateTime.TryParse(model.BirthDay, out birthDay))
                {
                    var user = UserAccount.CreateUser(birthDay, info.Login.LoginProvider + info.Login.ProviderKey, model.NickName, model.Email, model.Gender);
                    IdentityResult result = await UserManager.CreateAsync(user);
                    if (result.Succeeded)
                    {
                        result = await UserManager.AddLoginAsync(user.Id, info.Login);
                        if (result.Succeeded)
                        {
                            await SignInAsync(user, false);

                            // アカウント確認とパスワード リセットを有効にする方法の詳細については、http://go.microsoft.com/fwlink/?LinkID=320771 を参照してください
                            // このリンクを含む電子メールを送信します
                            // string code = await UserManager.GenerateEmailConfirmationTokenAsync(user.Id);
                            // var callbackUrl = Url.Action("ConfirmEmail", "Account", new { userId = user.Id, code = code }, protocol: Request.Url.Scheme);
                            // SendEmail(user.Email, callbackUrl, "アカウントの確認", "このリンクをクリックすることによってアカウントを確認してください");

                            return RedirectToLocal(returnUrl);
                        }
                    }
                    AddErrors(result);
                }
                else
                {
                    throw new NotImplementedException();//誕生日のパースに失敗した際の処理
                }
            }

            ViewBag.ReturnUrl = returnUrl;
            return View(model);
        }

        //
        // POST: /Account/LogOff
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult LogOff()
        {
            AuthenticationManager.SignOut();
            return View();
        }

        //
        // GET: /Account/ExternalLoginFailure
        [AllowAnonymous]
        public ActionResult ExternalLoginFailure()
        {
            return View();
        }


        protected override void Dispose(bool disposing)
        {
            if (disposing && UserManager != null)
            {
                UserManager.Dispose();
                UserManager = null;
            }
            base.Dispose(disposing);
        }

        #region ヘルパー



        private IAuthenticationManager AuthenticationManager
        {
            get { return HttpContext.GetOwinContext().Authentication; }
        }

        private async Task SignInAsync(UserAccount user, bool isPersistent)
        {
            AuthenticationManager.SignOut(DefaultAuthenticationTypes.ExternalCookie);
            AuthenticationManager.SignIn(new AuthenticationProperties { IsPersistent = isPersistent },
                await user.GenerateUserIdentityAsync(UserManager));
        }

        private void AddErrors(IdentityResult result)
        {
            foreach (string error in result.Errors)
            {
                ModelState.AddModelError("", error);
            }
        }

        private void SendEmail(string email, string callbackUrl, string subject, string message)
        {
            // 電子メールの送信については、http://go.microsoft.com/fwlink/?LinkID=320771 を参照してください
        }

        private ActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }
            return RedirectToAction("Index", "Home");
        }

        #endregion

    }
}
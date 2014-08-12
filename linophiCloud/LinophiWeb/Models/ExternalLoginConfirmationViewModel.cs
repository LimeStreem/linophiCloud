using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;
using linophi.Models;
using linophi.Utility;

namespace LinophiWeb.Models
{
    public class ExternalLoginConfirmationViewModel
    {
        public bool IsValidated { get; set; }

        public ExternalLoginConfirmationViewModel()
        {
            IsValidated = true;
        }

        private bool ValidateBirthDay(int year, int month, int day)
        {
            return MathEx.IsValidDate(year, month, day) && DateTime.Today > new DateTime(year, month, day);
        }

        private void UpdateBirthday()
        {
            BirthDay = string.Format("{0}/{1}/{2}", Year, Month, Day);
        }

        private int _year;
        private int _month;
        private int _day;

        [Required]
        [EmailAddress]
        [Display(Name = "電子メール")]
        public string Email { get; set; }

        [Required]
        [Display(Name = "ニックネーム")]
        public string NickName { get; set; }

        [Required]
        [Display(Name = "性別")]
        public UserAccount.GenderType Gender { get; set; }

        [Required]
        [Display(Name = "年")]
        public string Year
        {
            get { return _year.ToString(); }
            set
            {
                int year;
                if (value.TryToInt32(out year))
                {
                    _year = year;
                    if (!ValidateBirthDay(year, _month, _day))
                    {
                        IsValidated = false;
                        return;
                    }
                    else
                    {
                        IsValidated = true;
                    }

                    UpdateBirthday();
                }
                else
                {
                    IsValidated = false;
                }
            }
        }

        [Required]
        [Display(Name = "月")]
        public string Month
        {
            get { return _month.ToString(); }
            set
            {
                int month;
                if (value.TryToInt32(out month))
                {
                    _month = month;
                    if (!ValidateBirthDay(_year, month, _day))
                    {
                        IsValidated = false;
                        return;
                    }
                    else
                    {
                        IsValidated = true;
                    }

                    UpdateBirthday();
                }
                else
                {
                    IsValidated = false;
                }
            }
        }

        [Required]
        [Display(Name = "日")]
        public string Day
        {
            get { return _day.ToString(); }
            set
            {
                int day;
                if (value.TryToInt32(out day))
                {
                    _day = day;
                    if (!ValidateBirthDay(_year, _month, day))
                    {
                        IsValidated = false;
                        return;
                    }
                    IsValidated = true;
                    UpdateBirthday();
                }
                else
                {
                    IsValidated = false;
                }
            }
        }

        public string BirthDay { get; set; }
    }
}
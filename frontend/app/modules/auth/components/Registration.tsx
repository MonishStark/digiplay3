import React, { useEffect, useState } from 'react';
import { Step1, Step2, Step3, Step4 } from './steps';
import { AlertDanger, AlertSuccess } from '../../alerts/Alerts';
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useAuth } from '../core/Auth'
import { register, registerGoogle, registerGoogleComp, registerNonComp } from '../core/_requests'
import { KTIcon } from '../../../../app/theme/helpers';
import { FormattedMessage } from 'react-intl';

const initialValues = {
  acceptTerms: false,
}

const registrationSchema = Yup.object().shape({
  acceptTerms: Yup.bool().required('You must accept the terms and conditions'),
})

const Registration: React.FC = () => {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState('');
  const [signUpMethod, setSignUpMethod] = useState('email');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userDetails, setUserDetails] = useState({
    firstname: '',
    lastname: '',
    email: '',
    mobileCountryCode: '+1',
    mobileNumber: '',
    password: '',
    code:''
  });
  const [companyDetails, setCompanyDetails] = useState({
    companyName: '',
    phoneNumberCountryCode: '+1',
    phoneNumber: '',
    orgType: '',
    mailingStreetName: '',
    mailingCountryName: '',
    mailingCityName: '',
    mailingStateName: '',
    mailingZip: '',
    billingStreetName: '',
    billingCountryName: '',
    billingCityName: '',
    billingStateName: '',
    billingZip: '',
  });
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const { saveAuth, setCurrentUser } = useAuth()
  const [checkboxTick, setCheckboxTick] = useState<boolean>(false)
  const [successGoogleLogin, setSuccessGoogleLogin] = useState(false);
  const [acceptTerm, setAcceptTerm] = useState(false);
  const [currency, setCurrency] = useState('USD')

  // --- Alert Timers ---
  useEffect(() => {
    if (successMessage !== "") {
      const timer = setTimeout(() => {
        setChecked(false);
        setTimeout(() => setSuccessMessage(""), 200);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage !== "") {
      const timer = setTimeout(() => {
        setChecked(false);
        setTimeout(() => setErrorMessage(""), 200);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // --- Validation Logic ---
  const isNonEmptyString = (value: any) =>
    typeof value === "string" && value.trim() !== "";

  const validateObjectStrings = ({ code, ...rest }: Record<string, unknown>) =>
  Object.values(rest)
    .filter((value): value is string => typeof value === "string")
    .every((value) => value.trim() !== "");

  const validateStep = () => {
    let isValid = false;
    let error = "";
    switch (step) {
      case 1:
        isValid = signUpMethod !== "social" && validateObjectStrings(userDetails);
        error = "Please fill in all required details or sign up with Google.";
        break;
      case 2:
        isValid = accountType !== "";
        error = "Please select an account type.";
        break;
      case 3:
        isValid = validateObjectStrings(companyDetails);
        error = "Please fill in all required details.";
        break;
      default:
        isValid = true;
    }

    if (!isValid) {
      setChecked(true);
      setErrorMessage(error);
    }
    return isValid;
  };

  // --- Handlers ---
  const handleAccountTypeChange = (value: string) => setAccountType(value);
  const handleOtherInputChange = () => { };
  const handleSignUpMethodChange = (value: string) => setSignUpMethod(value);
  const handleUserDetailsChange = (details: { [key: string]: string }) => {
    setUserDetails((prevDetails) => ({ ...prevDetails, ...details }));
  };
  const handleCompanyDetailsChange = (details: { [key: string]: string }) => {
    setCompanyDetails((prevDetails) => ({ ...prevDetails, ...details }));
  };

  const handleNextStep = () => {
    if (validateStep()) {
      switch (step) {
        case 1:
          setStep(2);
          break;
        case 2:
          if (['solo'].includes(accountType)) {
            setStep(4);
          } else {
            setStep(3);
          }
          break;
        case 3:
          setStep(4);
          break;
        default:
          break;
      }
    }
  };

  const handlePrevStep = () => {
    switch (step) {
      case 2:
        setStep(1);
        break;
      case 3:
        setStep(2);
        break;
      case 4:
        if (['solo'].includes(accountType)) {
          setStep(2);
        } else {
          setStep(3);
        }
        break;
      default:
        break;
    }
  };

  // --- REFACTORED SUBMISSION LOGIC ---

  /**
   * Centralized response handler for all registration types.
   * Handles success redirection/auth saving or error display.
   */
  const handleRegistrationResponse = (response: any, setSubmitting: (isSubmitting: boolean) => void) => {
    if (response.data.success) {
      if (response.data.payment.required) {
        window.location.href = response.data.payment.sessionURL;
      } else {
        const auth = {
          api_token: response.data.user.auth.accessToken,
          refresh_token: response.data.user.auth.refreshToken,
          user: response.data.user,
          company:response.data.company
        };
        saveAuth(auth);
        setCurrentUser({
          id:response.data.user.id,
          firstname:response.data.user.firstname,
          lastname: response.data.user.lastname,
          email: response.data.user.email,
          accountStatus: response.data.user.accountStatus,
          phoneNumberCountryCode:response.data.company?.phoneNumberCountryCode,
          phoneNumber: response.data.company?.phoneNumber,
          mobileCountryCode:response.data.user.mobileCountryCode,
          mobileNumber: response.data.user.mobileNumber,
          companyId: response.data.company?.id,
          companyName: response.data.company?.companyName,
          password: undefined,
          mailingAddress: response.data.company?.mailingAddress,
          role: response.data.user.role,
          auth: response.data.user.auth,
          billingAddress: response.data.company?.billingAddress,
          orgType: response.data.company?.orgType,
          avatarUrl: response.data.user.avatarUrl,
          twoFactorEnabled: response.data.user.twoFactorEnabled,
          companytwoFactorEnabled: response.data.company?.companytwoFactorEnabled,
          companyLogo: response.data.company?.companyLogo,
          accountType: response.data.user.accountType,
          language: response.data.user.language,
          companyLanguage: response.data.company?.language,
      });
      }
    } else {
      setLoading(false);
      setErrorMessage(response.data.message);
      setChecked(true);
      setSubmitting(false);
      window.scrollTo(0, 0);
    }
  };

  /**
   * Selects and executes the correct API request based on form state.
   */
  const executeRegistrationRequest = async (lastName: string) => {
    const pkceVerifier = sessionStorage.getItem('pkce_verifier') || ''
    // Case 1: Google Login - Solo
    if (successGoogleLogin && ['solo'].includes(accountType)) {
      const pkceVerifier = sessionStorage.getItem('pkce_verifier') || ''
      return registerGoogle(
        userDetails.code,
        pkceVerifier,
        userDetails.email,
        userDetails.firstname,
        lastName,
        avatarUrl,
        accountType,
        signUpMethod,
        currency
      );
    }

    // Case 2: Google Login - Company
    if (successGoogleLogin) {
      return registerGoogleComp(
        userDetails.code,
        pkceVerifier,
        userDetails.firstname,
        lastName,
        userDetails.email,
        companyDetails.phoneNumberCountryCode,
        companyDetails.phoneNumber,
        companyDetails.companyName,
        companyDetails.orgType,
        companyDetails.mailingStreetName,
        companyDetails.mailingCountryName,
        companyDetails.mailingCityName,
        companyDetails.mailingStateName,
        companyDetails.mailingZip,
        companyDetails.billingStreetName,
        companyDetails.billingCountryName,
        companyDetails.billingCityName,
        companyDetails.billingStateName,
        companyDetails.billingZip,
        avatarUrl,
        accountType,
        signUpMethod,
        currency
      );
    }

    // Case 3: Standard Login - Solo
    if (['solo'].includes(accountType)) {
      return registerNonComp(
        userDetails.firstname,
        userDetails.lastname,
        userDetails.email,
        userDetails.mobileCountryCode,
        userDetails.mobileNumber,
        userDetails.password,
        accountType,
        signUpMethod,
        currency
      );
    }

    // Case 4: Standard Login - Company
    return register(
      userDetails.firstname,
      userDetails.lastname,
      userDetails.email,
      companyDetails.phoneNumberCountryCode,
      companyDetails.phoneNumber,
      userDetails.mobileCountryCode,
      userDetails.mobileNumber,
      companyDetails.companyName,
      companyDetails.orgType,
      userDetails.password,
      companyDetails.mailingStreetName,
      companyDetails.mailingCountryName,
      companyDetails.mailingCityName,
      companyDetails.mailingStateName,
      companyDetails.mailingZip,
      companyDetails.billingStreetName,
      companyDetails.billingCountryName,
      companyDetails.billingCityName,
      companyDetails.billingStateName,
      companyDetails.billingZip,
      accountType,
      'email',
      currency
    );
  };

  const formik = useFormik({
    initialValues,
    validationSchema: registrationSchema,
    onSubmit: async ({ setSubmitting }: any) => {
      setLoading(true);
      const lastName = !userDetails.lastname ? '---' : userDetails.lastname;

      try {
        const response = await executeRegistrationRequest(lastName);
        handleRegistrationResponse(response, setSubmitting);
      } catch (error) {
        console.error(error)
        setLoading(false)
        setChecked(true)
        setErrorMessage('The registration details are incorrect')
        setSubmitting(false)
      }
    },
  });

  useEffect(() => {
    if (successGoogleLogin) {
      setStep(2);
    }
  }, [successGoogleLogin]);

  const handleAcceptTerm = () => {
    setAcceptTerm((prev) => !prev);
  }


  useEffect(() => {
    const formData = { step, accountType, signUpMethod, userDetails, companyDetails, acceptTerm, avatarUrl, successGoogleLogin };
    sessionStorage.setItem('registrationFormData', JSON.stringify(formData));
  }, [step, accountType, signUpMethod, userDetails, companyDetails, acceptTerm, avatarUrl, successGoogleLogin]);
  const setSuccessGoogleLoginHandler = (value: boolean) => {
    setSuccessGoogleLogin(value);
  }
    useEffect(() => {
    const storedFormData = sessionStorage.getItem('registrationFormData');
    if (storedFormData) {
      try {
        const { step, accountType, signUpMethod, userDetails, companyDetails, acceptTerm, avatarUrl, successGoogleLogin } = JSON.parse(storedFormData);
        if(userDetails.firstname !==''){
        setStep(step || 1);
        setAccountType(accountType || '');
        setSignUpMethod(signUpMethod || '');
        setUserDetails((prev) => ({ ...prev, ...userDetails }));
        setCompanyDetails((prev) => ({ ...prev, ...companyDetails }));
        setAvatarUrl(avatarUrl || '');
        setSuccessGoogleLogin(successGoogleLogin || false);
        setAcceptTerm(acceptTerm || false);
        }
      } catch (e) {
        console.error("Failed to parse registration form data from sessionStorage", e);
        sessionStorage.removeItem('registrationFormData');
      }
    }
  }, []);
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1
            userDetails={userDetails}
            signUpMethod={signUpMethod}
            onSignUpMethodChange={handleSignUpMethodChange}
            onUserDetailsChange={handleUserDetailsChange}
            setSuccessGoogleLogin={setSuccessGoogleLoginHandler}
            setAvatarUrl={setAvatarUrl}
            setErrorMessage={setErrorMessage}
            setChecked={setChecked}
          />
        );
      case 2:
        return (
          <Step2
          accountType={accountType}
            onAccountTypeChange={handleAccountTypeChange}
            onOtherInputChange={handleOtherInputChange}
            currency={currency}
            setCurrency={setCurrency}
            
          />
        );
      case 3:
        return (
          <Step3
            companyDetails={companyDetails}
            onCompanyDetailsChange={handleCompanyDetailsChange}
            checkboxTick={checkboxTick}
            setCheckboxTick={setCheckboxTick}
          />
        );
      case 4:
        return (
          <Step4
            accountType={accountType}
            signUpMethod={signUpMethod}
            userDetails={userDetails}
            companyDetails={companyDetails} />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {successMessage !== "" ? (
        <AlertSuccess message={successMessage} checked={checked} />
      ) : null}

      {errorMessage !== "" ? (
        <AlertDanger message={errorMessage} checked={checked} />
      ) : null}

      <div className="container mt-5">
        <form
          className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
          noValidate
          id='kt_login_signup_form'
          onSubmit={formik.handleSubmit}
        >
          {renderStep()}
          {step === 4 && (
            <div className='fv-row mb-8'>
              <label className='form-check form-check-inline' htmlFor='kt_login_toc_agree'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  id='kt_login_toc_agree'
                  checked={acceptTerm}
                  onChange={handleAcceptTerm}
                  disabled={loading}
                />
                <span>
                  <FormattedMessage id="AUTH.REGISTER.ACCEPT" /> {' '}
                  <a
                    href={import.meta.env.VITE_APP_TERMS_AND_CONDITIONS}
                    target='_blank'
                    rel="noopener noreferrer"
                    className='ms-1 link-primary'
                  >
                    <FormattedMessage id="AUTH.REGISTER.TERMS" />
                  </a>
                  .
                </span>
              </label>
              {formik.touched.acceptTerms && formik.errors.acceptTerms && (
                <div className='fv-plugins-message-container'>
                  <div className='fv-help-block'>
                    <span role='alert'><>{formik.errors.acceptTerms}</></span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className={`d-flex flex-stack gap-4`}>
            {step === 1 && (
              <a href='/auth' type="button" className="btn btn-primary text-nowrap">
                <KTIcon iconName='arrow-left' className='fs-4 me-1' />
                <FormattedMessage id='AUTH.BACK_TO_LOGIN' />
              </a>
            )}
            {step > 1 && (
              <button type="button" className="btn btn-primary text-nowrap" onClick={handlePrevStep} disabled={formik.isSubmitting || loading}>
                <KTIcon iconName='arrow-left' className='fs-4 me-1' />
                <FormattedMessage id="AUTH.REGISTER.BACK" />
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                className="btn btn-primary text-nowrap"
                onClick={handleNextStep}
              >
                <FormattedMessage id="BUTTON.CONTINUE" />
                <KTIcon iconName='arrow-right' className='fs-4 ms-1' />
              </button>
            ) : (
              <div className='text-center text-nowrap'>
                <button
                  type='submit'
                  id='kt_sign_up_submit'
                  className='btn btn-lg btn-success w-100'
                  disabled={formik.isSubmitting || !formik.isValid || !acceptTerm || loading}
                >
                  {!loading && (
                    <span className='indicator-label'>
                      <FormattedMessage id="BUTTON.SUBMIT" />
                      <KTIcon iconName='send' className='fs-4 ms-2 text-white' />
                    </span>
                  )}
                  {loading && (
                    <span className='indicator-progress' style={{ display: 'block' }}>
                      <FormattedMessage id="BUTTON.WAIT" />{' '}
                      <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

export { Registration };

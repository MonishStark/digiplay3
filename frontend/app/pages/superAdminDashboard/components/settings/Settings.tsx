import { useEffect, useState } from 'react'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { AlertSuccess, AlertDanger } from '../../../../modules/alerts/Alerts'
import { getAdminENV, updateAdminENV } from '../../api'
import { Form } from 'react-bootstrap'
import { useAppContext } from '../../../AppContext/AppContext'
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css"; 
import { FormattedMessage } from 'react-intl'

const profileDetailsSchema = Yup.object().shape({
  CONVERSATION_NUMBER_TO_PASS: Yup.string().required('Conversation Number To Pass is required'),
  NO_OF_CITATIONS: Yup.string().required('NO OF CONTEXT TO RETRIVE is required'),
  BIGQUERY_FAILURE_RESPONSE: Yup.string().required('BIGQUERY FAILURE RESPONSE is required'),
  DEFAULT_CHAT_NAME: Yup.string().required('DEFAULT CHAT NAME is required'),
  PPT_PROMPT: Yup.string().required('PPT prompt is required'),
  PDF_PROMPT: Yup.string().required('PDF prompt is required'),
  DOC_PROMPT: Yup.string().required('DOC prompt is required'),
  XLSX_PROMPT: Yup.string().required('XLSX prompt is required'),
  IMAGE_PROMPT: Yup.string().required('IMAGE prompt is required'),
  AUDIO_PROMPT: Yup.string().required('AUDIO prompt is required'),
  VIDEO_PROMPT: Yup.string().required('VIDEO prompt is required'),
  CHAT_OUTPUT_TOKEN: Yup.number().min(1, 'CHAT OUTPUT TOKEN must be at least 1').max(4096, 'CHAT OUTPUT TOKEN must be at most 4096').required('Token is required'),
  ACTIVE_PAYMENT_CURRENCIES: Yup.array().min(1, 'Select atleast one payment currency').required('Currency is required'),
});

export function Settings() {
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [envData, setENVData] = useState<any>([])
  const {appData} = useAppContext()

  const [activeCurrencies, setActiveCurrencies] = useState([''])

   // Function to remove currency from the activeCurrencies array
  const removeCurrency = (currency: string) => {
    const updatedCurrencies = activeCurrencies.filter((item: any) => item !== currency);
    setActiveCurrencies(updatedCurrencies);
    
    // Update the formik field if you want to store the updated list
    formik.setFieldValue("ACTIVE_PAYMENT_CURRENCIES", updatedCurrencies);
  };

  const addCurrency = (currency: string) => {
  // Check if the currency is already in the list to avoid duplicates
  if (!activeCurrencies.includes(currency)) {
    const updatedCurrencies = [...activeCurrencies, currency];
    setActiveCurrencies(updatedCurrencies);

    // Sanitize and update the value in Formik
    formik.setFieldValue("ACTIVE_PAYMENT_CURRENCIES", updatedCurrencies);
  }
};

  if (successMessage !== "") {
    setTimeout(() => {
      setChecked(false);
      setTimeout(() => {
        setSuccessMessage("");
      }, 200);
    }, 5000);
  }

  if (errorMessage !== "") {
    setTimeout(() => {
      setChecked(false);
      setTimeout(() => {
        setErrorMessage("");
      }, 200);
    }, 5000);
  }

  const initialValues: any = {};
  const formik = useFormik<any>({
    initialValues,
    validationSchema: profileDetailsSchema,
    onSubmit: (values) => {
      setLoading(true)
      setTimeout(() => {
        updateAdminENV(values)
          .then((response) => {
            if (response.data.success) {
              Object.entries<string>(values).forEach(([key, value]) => {
                formik.setFieldValue(key, value);
              });
              setChecked(true)
              setSuccessMessage(response.data.message)
              setLoading(false)
              window.scrollTo(0, 0)
            } else {
              setChecked(true)
              setErrorMessage(response.data.message)
              setLoading(false)
              window.scrollTo(0, 0)
            }
          })
          .catch(() => {
            setChecked(true)
            setErrorMessage('Failed to update details')
            setLoading(false)
            window.scrollTo(0, 0)
          })
      }, 1000)
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data: any = await getAdminENV();
        setENVData(data.data.env);

        const initialFormValues: any = {};
        data.data.env.forEach((env: any) => {
          if(env.meta_key == "ACTIVE_PAYMENT_CURRENCIES"){
            if (typeof env.meta_value === 'string') {
              const currArr = env.meta_value.replace(/[\[\]'"]/g, '').split(',').map((currency: string) => currency.trim())
              setActiveCurrencies(currArr)
              initialFormValues[env.meta_key] = currArr;
            }
          }
          else {
            initialFormValues[env.meta_key] = env.meta_value;
          }
        });
        formik.setValues(initialFormValues);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchData();
  }, []);

  const transformString = (inputString: string): string => {
    if (/([a-z0-9])([A-Z])/.test(inputString)) {
      return inputString.replace(/([a-z])([0-9]|[A-Z])/g, '$1 $2').toUpperCase();
    } else if (/_/.test(inputString)) {
      return inputString.replace(/_/g, ' ').toUpperCase();
    } else {
      return inputString.toUpperCase();
    }
  }

  const handleCloudIntegrationChangeMobile = (e: React.ChangeEvent<HTMLInputElement>) => {
    formik.setFieldValue(
      'CLOUD_INTEGRATION_MOBILE',
      e.target.checked ? 1 : 0
    );
  };

  const handleCloudIntegrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    formik.setFieldValue(
      'CLOUD_INTEGRATION',
      e.target.checked ? 1 : 0
    );
  };

  function handleSwitchChange(metaKey: string, e: React.ChangeEvent<HTMLInputElement>) {
    formik.setFieldValue(metaKey, e.target.checked ? 1 : 0);
  }

  function handleCurrencyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.preventDefault();
    addCurrency(e.target.value);
  }

  const createRemoveCurrencyHandler = (c: string) => () => {
    removeCurrency(c);
  };

  const createSwitchChangeHandler = (metaKey: string) => 
  (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSwitchChange(metaKey, e);
  };

  return (
    <div className='card mb-5 mb-xl-10'>
      <div className='card-header border-0 cursor-pointer'>
        <div className='card-title m-0'>
          <h3 className='fw-bolder m-0'><FormattedMessage id="SUPERADMIN.CONFIGURATION" /></h3>
        </div>
      </div>

      {successMessage !== "" ? (
        <AlertSuccess message={successMessage} checked={checked} />
      ) : null}

      {errorMessage !== "" ? (
        <AlertDanger message={errorMessage} checked={checked} />
      ) : null}

      <div id='kt_account_profile_details' className='collapse show'>
        <form onSubmit={formik.handleSubmit} noValidate className='form'>
          <div className='card-body border-top p-9'>
            {envData.length > 0 && (
              envData.map((env: any) => (
                <div key={env.id} className='row mb-6'>
                  {
                    env.meta_key === 'FORMAT_SUFFIX' ?
                    <>
                    {
                      formik.values.FORMAT_CHAT_RESPONSE == 1 &&
                      <label className='col-lg-3 col-form-label fw-bold fs-6'>
                        <span className='required'>{transformString(env.meta_key)}</span>
                      </label>
                    }
                    </>
                    :
                    <>
                    {
                      (env.meta_key === 'IMAGE_PROMPT' || env.meta_key === 'AUDIO_PROMPT' || env.meta_key === 'VIDEO_PROMPT') ?
                        <label className='col-lg-3 col-form-label fw-bold fs-6'>
                          <span className='required'>{transformString(env.meta_key)}</span>
                          <Tippy content={`Changes may impact the Summary generated for ${env.meta_key === 'IMAGE_PROMPT' ? "Image file" : ""}${env.meta_key === 'AUDIO_PROMPT' ? "Audio file" : ""}${env.meta_key === 'VIDEO_PROMPT' ? "Video file" : ""}
                          `} trigger="click">
                            <i className="ms-3 bi bi-info-circle fs-6"
                            title={`Changes may impact the Summary generated for ${env.meta_key === 'IMAGE_PROMPT' ? "Image file" : ""}${env.meta_key === 'AUDIO_PROMPT' ? "Audio file" : ""}${env.meta_key === 'VIDEO_PROMPT' ? "Video file" : ""}
                            `}>
                            </i>
                          </Tippy>
                        </label>
                        :
                        <>
                        {
                           (env.meta_key === 'PDF_PROMPT' || env.meta_key === 'PPT_PROMPT' || env.meta_key === 'DOC_PROMPT' || env.meta_key === 'XLSX_PROMPT') ?
                           <label className='col-lg-3 col-form-label fw-bold fs-6'>
                             <span className='required'>{transformString(env.meta_key)}</span>
                             <Tippy content={`Changes may impact the Summary generated for ${env.meta_key === 'PDF_PROMPT' ? "PDF file" : ""}${env.meta_key === 'PPT_PROMPT' ? "PPT file" : ""}${env.meta_key === 'DOC_PROMPT' ? "DOC file" : ""}${env.meta_key === 'XLSX_PROMPT' ? "XLSX file" : ""}
                              `} trigger="click">
                                <i className="ms-3 bi bi-info-circle fs-6"
                              title={`Changes may impact the Summary generated for ${env.meta_key === 'PDF_PROMPT' ? "PDF file" : ""}${env.meta_key === 'PPT_PROMPT' ? "PPT file" : ""}${env.meta_key === 'DOC_PROMPT' ? "DOC file" : ""}${env.meta_key === 'XLSX_PROMPT' ? "XLSX file" : ""}
                              `}>
                              </i>
                             </Tippy>
                           </label>
                           :
                           <>
                            {
                              env.meta_key === "FORMAT_CHAT_RESPONSE" ?
                              <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                <span className='required'>{transformString(env.meta_key)}</span>
                                <Tippy content={`${appData?.defaultResponseSuffix}`} trigger="click">
                                  <i className="ms-3 bi bi-info-circle fs-6"
                                  title={`${appData?.defaultResponseSuffix}`}>
                                  </i>
                                </Tippy>
                              </label>
                            :
                            <>
                            {
                              env.meta_key === 'FILE_UPLOAD_EXPIRY' ? (
                              <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                <span className='required'>
                                  {transformString(env.meta_key)} (Hours)
                                </span>
                                
                              </label>
                              )                              :
                              env.meta_key === 'MAX_STORAGE' ? (
                              <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                <span className='required'>
                                  {transformString(env.meta_key)} (GB)
                                </span>
                                
                              </label>
                              )                              :
                              env.meta_key === 'USER_RECORDING_PROMPT'?(
                                <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                <span className='required'>
                                  {transformString(env.meta_key)} (Minutes)
                                </span>                                
                              </label>
                              ):
                              env.meta_key === 'RECORDING_MONTHLY_LIMIT'?(
                                <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                <span className='required'>
                                  {transformString(env.meta_key)}
                                </span>                                
                              </label>
                              ):
                              env.meta_key === "ACTIVE_PAYMENT_CURRENCIES"?
                              <>
                                <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                  <span className='required'>
                                    {transformString(env.meta_key)}
                                  </span>                                
                                </label>
                              </>
                              :
                              env.meta_key === "CLOUD_INTEGRATION_MOBILE"?
                              <>
                                <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                  <span className=''>
                                    
                                  </span>                                
                                </label>
                              </>
                              :
                              env.meta_key === "DEFAULT_CLOUD_INTEGRATION"?
                              <>
                                <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                  <span className='required'>
                                    {transformString(env.meta_key)}
                                  </span>
                                  <Tippy content={`Changes will impact the default cloud integration for new Clients.`} trigger="click">
                                    <i className="ms-3 bi bi-info-circle fs-6"
                                    title={`Changes will impact the default cloud integration for new Clients.`}>
                                    </i>
                                  </Tippy>
                                </label>
                              </>
                              :
                              <label className='col-lg-3 col-form-label fw-bold fs-6'>
                                <span className='required'>{transformString(env.meta_key)}</span>
                              </label>
                            }
                            </>
                            }
                           
                           </>
                        }
                        </>
                    }
                    </>
                  }
                 
                  <div className='col-lg-9 fv-row'>
                    {env.meta_key === 'CHAT_MODEL' ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)}
                        style={{ appearance: 'auto' }}
                      >
                        {
                          appData?.chatModel.split(",").map((item) => {
                            return <>
                              <option value={`${item}`} key={item}>{item}</option>
                            </>
                          })
                        }
                      </select>
                    ) : env.meta_key === "CHAT_OUTPUT_TOKEN" ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)}
                        style={{ appearance: 'auto' }}
                      >
                        <option value='2048'>2048</option>
                        <option value='4096'>4096</option>
                      </select>
                    ): env.meta_key === "MAX_STORAGE" ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)} 
                        style={{ appearance: 'auto' }}
                      >
                        <option value='3'>3</option>
                        <option value='4'>4</option>
                        <option value='5'>5</option>
                      </select>
                    ): env.meta_key === "MAX_QUERY" ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)} 
                        style={{ appearance: 'auto' }}
                      >
                        <option value='500'>500</option>
                        <option value='1000'>1000</option>
                        <option value='1500'>1500</option>
                      </select>
                    ): env.meta_key === "MAX_USERS" ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)} 
                        style={{ appearance: 'auto' }}
                      >
                        <option value='5'>5</option>
                        <option value='10'>10</option>
                        <option value='15'>15</option>
                      </select>  
                    ): env.meta_key === "MAX_TEAMS" ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)} 
                        style={{ appearance: 'auto' }}
                      >
                        <option value='5'>5</option>
                        <option value='10'>10</option>
                        <option value='15'>15</option>
                      </select>  
                    ): env.meta_key === "LOG_LEVEL" ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)}
                        style={{ appearance: 'auto' }}
                      >
                        <option value='debug'>debug</option>
                        <option value='info'>info</option>
                        <option value='warn'>warn</option>
                        <option value='error'>error</option>
                      </select>
                    ) : env.meta_key === 'NO_OF_CITATIONS' ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)}
                        style={{ appearance: 'auto' }}
                      >
                        <option value='0'>0</option>
                        <option value='1'>1</option>
                        <option value='2'>2</option>
                        <option value='3'>3</option>
                        <option value='4'>4</option>
                        <option value='5'>5</option>
                        <option value='6'>6</option>
                        <option value='7'>7</option>
                        <option value='8'>8</option>
                        <option value='9'>9</option>
                        <option value='10'>10</option>
                      </select>
                    ) : env.meta_key === 'FILE_UPLOAD_EXPIRY' ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)}
                        style={{appearance: 'auto'}}
                      >
                        <option value='12'>12 </option>
                        <option value='24'>24 </option>
                        <option value='32'>32 </option>
                        <option value='48'>48 </option>
                        <option value='72'>72 </option>
                      </select>
                      ): env.meta_key === 'USER_RECORDING_PROMPT' ? (
                        <select
                          className='form-control form-control-lg form-control-solid'
                          {...formik.getFieldProps(env.meta_key)}
                          style={{appearance: 'auto'}}
                        >
                          <option value='10'>10 </option>
                          <option value='20'>20 </option>
                          <option value='30'>30 </option>
                          <option value='60'>60 </option>
                          <option value='120'>120 </option>
                          <option value='150'>150 </option>
                        </select>
                        ): env.meta_key === 'RECORDING_MONTHLY_LIMIT' ? (
                          <select
                            className='form-control form-control-lg form-control-solid'
                            {...formik.getFieldProps(env.meta_key)}
                            style={{appearance: 'auto'}}
                          >
                            <option value='10'>10 </option>
                            <option value='20'>20 </option>
                            <option value='30'>30 </option>
                            <option value='40'>40 </option>
                            <option value='50'>50 </option>
                          </select>
                    ) : env.meta_key === 'CONVERSATION_NUMBER_TO_PASS' ? (
                      <select
                        className='form-control form-control-lg form-control-solid'
                        {...formik.getFieldProps(env.meta_key)}
                        style={{ appearance: 'auto' }}
                      >
                        <option value='4'>4</option>
                        <option value='5'>5</option>
                        <option value='6'>6</option>
                        <option value='7'>7</option>
                        <option value='8'>8</option>
                        <option value='9'>9</option>
                        <option value='10'>10</option>
                        <option value='11'>11</option>
                        <option value='12'>12</option>
                        <option value='13'>13</option>
                        <option value='14'>14</option>
                        <option value='15'>15</option>
                        <option value='16'>16</option>
                        <option value='17'>17</option>
                        <option value='18'>18</option>
                        <option value='19'>19</option>
                        <option value='20'>20</option>
                      </select>
                    ) : env.meta_key === 'Embedding_Model' ? (
                      <input
                        type='text'
                        className='form-control form-control-lg form-control-solid'
                        placeholder={transformString(env.meta_key)}
                        {...formik.getFieldProps(env.meta_key)}
                      />
                    ) : env.meta_key === 'FORMAT_CHAT_RESPONSE' ? (
                      <div className='col-lg-4 col-form-label fw-bold fs-6 d-flex align-items-center'>
                        <Form.Check
                          type="switch"
                          id="default2FA"
                          checked={formik.values.FORMAT_CHAT_RESPONSE == 1}
                          onChange={createSwitchChangeHandler(env.meta_key)}
                        />
                      </div>
                    ) : env.meta_key === 'DEFAULT_CLOUD_INTEGRATION' ? (
                      <div className='col-lg-4 col-form-label fw-bold fs-6 d-flex align-items-center'>
                        <Form.Check
                          type="switch"
                          checked={formik.values.DEFAULT_CLOUD_INTEGRATION == 1}
                          onChange={createSwitchChangeHandler(env.meta_key)}
                        />
                      </div>
                    ) : env.meta_key === 'MULTILANGUAGE' ? (
                      <div className='col-lg-4 col-form-label fw-bold fs-6 d-flex align-items-center'>
                        <Form.Check
                          type="switch"
                          checked={formik.values.MULTILANGUAGE == 1}
                          onChange={createSwitchChangeHandler(env.meta_key)}
                        />
                      </div>
                    ): env.meta_key === 'PAYMENT_MODE' ? (
                      <div className='col-lg-4 col-form-label fw-bold fs-6 d-flex align-items-center'>
                        <Form.Check
                          type="switch"
                          checked={formik.values.PAYMENT_MODE == 1}
                          onChange={createSwitchChangeHandler(env.meta_key)}
                        />
                      </div>
                    ) : env.meta_key === 'CLOUD_INTEGRATION' ? (
                      <div className='col-lg-8 col-form-label fw-bold fs-6 d-flex align-items-center gap-5'>
                        <div className='d-flex align-items-center gap-2'>
                          <Form.Check
                            type="switch"
                            checked={formik.values.CLOUD_INTEGRATION === 1}
                            onChange={handleCloudIntegrationChange}
                          />
                          <label className='fw-bold fs-6'>Web</label>
                        </div>
                        <div className='d-flex align-items-center gap-2'>
                          <Form.Check
                            type="switch"
                            checked={formik.values.CLOUD_INTEGRATION_MOBILE === 1}
                            onChange={handleCloudIntegrationChangeMobile}
                          />
                          <label className='fw-bold fs-6'>Mobile</label>
                        </div>
                      </div>
                    ) : env.meta_key === 'CLOUD_INTEGRATION_MOBILE' ? null 
                    : (env.meta_key === 'IMAGE_PROMPT') ? (
                      <>
                        <textarea
                          className='form-control form-control-lg form-control-solid'
                          placeholder={transformString(env.meta_key)}
                          {...formik.getFieldProps(env.meta_key)}
                          style={{ height: '200px' }}
                          title="Changes may impact the Summary generated for documents"
                        ></textarea>
                      </>
                    ) : (env.meta_key === 'AUDIO_PROMPT') ? (
                      <>
                        <textarea
                          className='form-control form-control-lg form-control-solid'
                          placeholder={transformString(env.meta_key)}
                          {...formik.getFieldProps(env.meta_key)}
                          style={{ height: '200px' }}
                          title="Changes may impact the Summary generated for documents"
                        ></textarea>
                      </>
                    ) : (env.meta_key === 'VIDEO_PROMPT') ? (
                      <>
                        <textarea
                          className='form-control form-control-lg form-control-solid'
                          placeholder={transformString(env.meta_key)}
                          {...formik.getFieldProps(env.meta_key)}
                          style={{ height: '200px' }}
                          title="Changes may impact the Summary generated for documents"
                        ></textarea>
                      </>
                    ) : (env.meta_key === 'PDF_PROMPT') ? (
                      <>
                        <textarea
                          className='form-control form-control-lg form-control-solid'
                          placeholder={transformString(env.meta_key)}
                          {...formik.getFieldProps(env.meta_key)}
                          style={{ height: '200px' }}
                          title="Changes may impact the Summary generated for documents"
                        ></textarea>
                      </>
                    ) : (env.meta_key === 'XLSX_PROMPT') ? (
                      <>
                        <textarea
                          className='form-control form-control-lg form-control-solid'
                          placeholder={transformString(env.meta_key)}
                          {...formik.getFieldProps(env.meta_key)}
                          style={{ height: '200px' }}
                          title="Changes may impact the Summary generated for documents"
                        ></textarea>
                      </>
                    ) : (env.meta_key === 'DOC_PROMPT') ? (
                      <>
                        <textarea
                          className='form-control form-control-lg form-control-solid'
                          placeholder={transformString(env.meta_key)}
                          {...formik.getFieldProps(env.meta_key)}
                          style={{ height: '200px' }}
                          title="Changes may impact the Summary generated for documents"
                        ></textarea>
                      </>
                    ) : (env.meta_key === 'PPT_PROMPT') ? (
                      <>
                        <textarea
                          className='form-control form-control-lg form-control-solid'
                          placeholder={transformString(env.meta_key)}
                          {...formik.getFieldProps(env.meta_key)}
                          style={{ height: '200px' }}
                          title="Changes may impact the Summary generated for documents"
                        ></textarea>
                      </>
                    ) : (env.meta_key === 'FORMAT_SUFFIX' && formik.values.FORMAT_CHAT_RESPONSE == 1) ? (
                      <textarea
                        className='form-control form-control-lg form-control-solid'
                        placeholder={transformString(env.meta_key)}
                        {...formik.getFieldProps(env.meta_key)}
                        style={{ height: '100px' }}
                      ></textarea>
                    ) : (env.meta_key === "ACTIVE_PAYMENT_CURRENCIES") ? (
                      <>
                       
                       {(activeCurrencies || []).map((currency: any, index: number) => (
                          <span 
                          className="bg-gray-200 rounded-lg px-4 py-2 mr-2 mb-2 relative inline-block shadow-md flex items-center justify-between ms-2 me-2" 
                          key={index}>
                            {currency}
                            <button
                              type="button"
                              className="border-0 bg-transparent p-0"
                              onClick={createRemoveCurrencyHandler(currency)}
                            >
                              <sup className="text-danger cursor-pointer p-1 ms-2">X</sup>
                            </button>
                          </span>
                        ))}
                       <select
                          className='form-control form-control-lg form-control-solid mt-3'
                          onChange={handleCurrencyChange}
                          style={{ appearance: 'auto' }}
                       >
                        {
                          JSON.parse(appData.paymentCurrencies).map((val: any, index: number) => {
                            return <>
                                <option value={val.currency} key={index}>
                                  {val.country} ({val.currency})
                                </option>
                            </>
                          })
                        }
                        </select>
                      </>
                    ) : (
                      <>
                      {
                        env.meta_key !== 'FORMAT_SUFFIX' &&
                        <input
                          type='text'
                          className='form-control form-control-lg form-control-solid'
                          placeholder={transformString(env.meta_key)}
                          {...formik.getFieldProps(env.meta_key)}
                        />
                      }
                      </>
                    )}
                    {formik.touched[env.meta_key] && formik.errors[env.meta_key] && (
                      <div className='fv-plugins-message-container'>
                        <div className='fv-help-block'><>{formik.errors[env.meta_key]}</></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className='card-footer d-flex justify-content-end py-6 px-9'>
            <button type='submit' className='btn btn-primary' disabled={loading}>
              {!loading && <FormattedMessage id="PROFILE.SAVE_CHANGES" /> }
              {loading && (
                <span className='indicator-progress' style={{ display: 'block' }}>
                  <FormattedMessage id="BUTTON.WAIT" />{' '}
                  <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

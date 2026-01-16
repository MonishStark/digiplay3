import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom";
import { checkPaymentStatus } from "../core/_requests";

const StripeStatusPage = () => {

    const params = new URLSearchParams(window.location.search);
    const successString: string | null = params.get("success");
    const email: any = params.get('email');

    const [processing, setProcessing] = useState<boolean>(true)
    const [status, setStatus] = useState<'success' | 'failed' | ''>('')
    const navigate = useNavigate()

    let success: boolean | null;
    if (successString === "true") {
        success = true;
    } else if (successString === "false") {
        success = false;
    } else {
        success = null;
    }

    const _checkTransaction = async (email: string | null) => {
        const result = await checkPaymentStatus(email);

        if (result.data.status == 'success') {
            setStatus('success')
            setProcessing(false)
        } else if (result.data.status == 'failed') {
            setStatus('failed')
            setProcessing(false)
        } else if (result.data.status == 'pending') {
            _checkTransaction(email)
        }
    }

    useEffect(() => {
        _checkTransaction(email)
    }, [])

    const handleGoBack = () => {
        navigate('/auth/registration');
    };

    const handleGoToLogin = () => {
        navigate('/auth/login');
    };

    return (
        <>
            <div
                className="modal"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'rgba(0,0,0, 0.4)',
                    zIndex: '2',
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    height: '100%'
                }}
            >

                {success &&
                    <>
                        {!processing &&
                            <>
                                {status == 'success' &&
                                    <>
                                            <div
                                                className="d-flex flex-column mx-auto justify-content-center"
                                                style={{ width: '30%' }}
                                            >
                                                <span
                                                    className="text-white fw-bolder text-center"
                                                    style={{ fontSize: '40px', fontFamily: "'Antonio', sans-serif", letterSpacing: '1px' }}
                                                >
                                                    Payment Success
                                                </span>
                                                <br />
                                                <span
                                                    className='text-white text-center mx-auto'
                                                    style={{ width: '70%', fontSize: '15px' }}
                                                >
                                                    <span className="mx-1">Account creation successful. Please return to the login screen and login.</span>
                                                </span>
                                                <button
                                                    className="btn btn-primary mt-4"
                                                    onClick={handleGoToLogin}
                                                >
                                                    Go To Login
                                                </button>
                                            </div>
                                    </>
                                }

                                {status == 'failed' &&
                                    <div
                                        className="d-flex flex-column mx-auto justify-content-center"
                                        style={{ width: '30%' }}
                                    >
                                        <span
                                            className="text-white fw-bolder text-center"
                                            style={{ fontSize: '40px', fontFamily: "'Antonio', sans-serif", letterSpacing: '1px' }}
                                        >
                                            Account creation failed
                                        </span>
                                        <br />
                                        <span
                                            className='text-white text-center mx-auto'
                                            style={{ width: '70%', fontSize: '15px' }}
                                        >
                                            Your account creation failed due to internal error.
                                        </span>
                                    </div>
                                }
                                {/* {status == 'pay_success_mint_failed' && 
                                
                                } */}
                            </>
                        }

                        {processing &&
                            <div className="d-flex flex-column mx-auto justify-content-center" style={{ width: '70%', marginTop: '300px' }}>
                                <span className="text-white fw-bolder fs-1 text-center mb-5">
                                    Processing your payment
                                </span>
                                <span className="text-white fw-bolder fs-5 text-center mb-5">
                                    Please wait while we process your payment, do not refresh your page.
                                </span>

                            </div>
                        }
                    </>
                }
                {!success &&
                    <div className="d-flex flex-column mx-auto justify-content-center" style={{ width: '70%', marginTop: '300px' }}>
                        <span className="text-white fw-bolder fs-1 text-center mb-5">
                            Cancelled
                        </span>
                        <span className="text-white fw-bolder fs-5 text-center mb-5">
                            Your transaction have been cancelled.
                        </span>
                        <div className='d-flex justify-content-center py-6 px-9'>
                            <button
                                className="btn btn-primary mt-4"
                                onClick={handleGoBack}
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                }
            </div>
        </>
    )
}

export { StripeStatusPage }
import { useEffect, useState } from "react";
import { AlertDanger, AlertSuccess } from "../alerts/Alerts";
import { useAuth } from "../auth";
import { OnboardingStep1 } from "./components/OnboardStep1";
import { OnboardingStep2 } from "./components/OnboardStep2";
import { OnboardingStep3 } from "./components/OnboardStep3";
import { useNavigate } from "react-router-dom";

const DocumentMangement = () => {
    const [successResMessage, setSuccessResMessage] = useState<string>('')
    const [failureResMessage, setFailureResMessage] = useState<string>('')
    const [checked, setChecked] = useState<boolean>(true)
    const [nextStep, setNextStep] = useState<boolean>(false)
    const { teamList, auth } = useAuth()
    const navigate = useNavigate();

    if (successResMessage) {
        setTimeout(() => {
            setChecked(false)
            setTimeout(() => {
                setSuccessResMessage("");
            }, 200);
        }, 5000);
    }

    if (failureResMessage) {
        setTimeout(() => {
            setChecked(false)
            setTimeout(() => {
                setFailureResMessage("");
            }, 200);
        }, 5000);
    }

    const [showWelcome, setShowWelcome] = useState(false);
    useEffect(() => {
        if (auth?.user) {
            const timeoutId = setTimeout(() => {
                setShowWelcome(true);
            }, 400);

            return () => clearTimeout(timeoutId);
        }
    }, [auth?.user]);

    useEffect(()=>{
        if(teamList.length>0){
            navigate("/teams")
        }
    },[teamList])

    return (
        <>
            <div
                id="main"
            >
                {successResMessage !== undefined && successResMessage !== null && successResMessage !== "" ? (
                    <AlertSuccess message={successResMessage} checked={checked} />
                ) : null}

                {failureResMessage !== undefined && failureResMessage !== null && failureResMessage !== "" ? (
                    <AlertDanger message={failureResMessage} checked={checked} />
                ) : null}
            </div>
            {auth?.user?.role == 4 ? (
                <div />
            ) : (
                <>
                    {showWelcome && (
                        <>
                            {(teamList.length !== 0 || auth?.user?.role !== 1) && (
                                <OnboardingStep3 />
                            )}
                        </>
                    )}
                    {teamList.length === 0 && auth?.user?.role===1 && (
                        <>
                            {nextStep ? (
                                <OnboardingStep2
                                    setSuccessResMessage={setSuccessResMessage}
                                    setFailureResMessage={setFailureResMessage}
                                    setChecked={setChecked}
                                />
                            ) : (
                                <OnboardingStep1
                                    setNextStep={setNextStep}
                                />
                            )}
                        </>
                    )}
                </>
            )}
        </>
    )
}

export { DocumentMangement };
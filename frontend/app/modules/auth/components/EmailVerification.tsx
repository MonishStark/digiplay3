import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyAccount } from '../core/_requests'
import { useAuth } from '../core/Auth'
import { AuthModel } from '../core/_models';

const params = new URLSearchParams(window.location.search);

const token: string | null = params.get("token");
const userId: string | null = params.get("email")

function VerifyUser() {
    const { setCurrentUser, saveAuth, auth, setErrMsg, setSuccessMsg } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (userId && token) {

            verifyAccount(userId, token)
                .then((response) => {
                    if (response.data.success) {
                        setCurrentUser((user) => {
                            const updatedUser = user
                            if (updatedUser) {
                                updatedUser.accountStatus = true
                            }

                            let newAuth = auth
                            if (newAuth && newAuth.user) {
                                newAuth.user = updatedUser
                            }
                            saveAuth(newAuth)

                            return updatedUser
                        })
                        setSuccessMsg(response.data.message)
                        navigate('/');
                    } else {
                        setErrMsg(response.data.message)
                        navigate('/');
                    }
                })
                .catch((error) => {
                    setErrMsg('Account verification failed')
                    navigate('/');
                })
        }
    }, [])

    return (
        <></>
    )
}

export { VerifyUser }
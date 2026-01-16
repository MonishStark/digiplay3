/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { declineInvitation } from './api'
import { CustomCircularProgress } from '../custom/CustomCircularProgress'

const params = new URLSearchParams(window.location.search);

const token: string | null = params.get("token");
const email: string | null = params.get("email")


export function DeclineInvitation() {
  const [fetchingInv, setFetchingInv] = useState<boolean>(true)
  const navigate = useNavigate()

  useEffect(() => {
    declineInvitation(email, token)
      .then((response) => {
        if (response.data.success) {
          setFetchingInv(false)
          navigate('/status/declined')
        } else {
          if (response.data.status == 'invalid' || response.data.status == 'failed') {
            navigate('/status/invalid-invitation')
          } else if (response.data.status == 'expired') {
            navigate('/status/expired-invitation')
          } else if (response.data.status == 'declined') {
            navigate('/status/declined-invitation')
          } else if (response.data.status == 'registered') {
            navigate('/status/registered-invitation')
          } else if (response.data.status == 'invalid-token') {
            navigate('/status/invalid-token')
          }
        }
      })
      .catch((err) => console.log(err))
  }, [])

  return (
    <>
      {fetchingInv &&
        <CustomCircularProgress />
      }
    </>
  )
}

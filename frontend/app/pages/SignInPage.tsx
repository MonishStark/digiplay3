import React, {useEffect} from 'react'
import {useAppContext} from './AppContext/AppContext'
import {useLocation, useNavigate} from 'react-router-dom'

const SignInPage: React.FC = () => {
  const {appData} = useAppContext()
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const params = new URLSearchParams(location.search)

    const status = params.get('status')
    const code = params.get('code')
    const flow = params.get('flow')
    const avatar = params.get('avatar')
    const provider = params.get('provider')
    const email = params.get('email')
    const firstname = params.get('firstname')
    const lastname = params.get('lastname')
    const token = params.get('token')

    // Build new query params
    const nextParams = new URLSearchParams()

    if (status === 'success' && code && flow !== 'registration' && flow !== 'invited') {
      nextParams.set('status', status)
      if (code) nextParams.set('code', code)
      navigate(`/auth/login?${nextParams.toString()}`, {replace: true})
    } else if (status === 'success' && flow === 'registration') {
      if (status) nextParams.set('status', status)
      if (avatar) nextParams.set('avatar', avatar)
      if (provider) nextParams.set('provider', provider)
      if (email) nextParams.set('email', email)
      if (firstname) nextParams.set('firstname', firstname)
      if (lastname) nextParams.set('lastname', lastname)
      if (code) nextParams.set('code', code)
      navigate(`/auth/registration?${nextParams.toString()}`, {replace: true})
    } else if (status == 'email_already_registered') {
      if (status) nextParams.set('status', status)
      if (email) nextParams.set('email', email)
      navigate(`/auth/registration?${nextParams.toString()}`, {replace: true})
    }else if (status=="success" && flow == "invited"){
      if (status) nextParams.set('status', status)
      if(token) nextParams.set('token', token)
      if (email) nextParams.set('email', email)
      if (avatar) nextParams.set('avatar', avatar)
      if (provider) nextParams.set('provider', provider)
      if (firstname) nextParams.set('firstname', firstname)
      if (lastname) nextParams.set('lastname', lastname)
      if (code) nextParams.set('code', code)
      navigate(`/auth/invite?${nextParams.toString()}`, {replace: true})
    } else if (status == 'success') {
      navigate('/upload-document')
    } else if (status == 'email_not_registered') {
      nextParams.set('status', status)
      navigate(`/auth/login?${nextParams.toString()}`, {replace: true})
    }
  }, [location.search, navigate])

  return (
    <>
      <style>
        {`
          :root {
            --primary: #2563eb;
            --text: #0f172a;
            --muted: #64748b;
            --bg: #ffffff;
          }

          * {
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
          }

          body {
            margin: 0;
            background: var(--bg);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont,
              "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
          }

          .signin-container {
            min-height: 100vh;
            padding: env(safe-area-inset-top) 24px env(safe-area-inset-bottom);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .logo {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            margin-bottom: 20px;
          }

          h1 {
            font-size: 22px;
            font-weight: 600;
            margin: 0 0 8px;
          }

          p {
            font-size: 15px;
            color: var(--muted);
            margin: 0;
            line-height: 1.4;
          }

          .spinner {
            margin: 28px auto 0;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 2px solid #e5e7eb;
            border-top-color: var(--primary);
            animation: spin 0.9s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          footer {
            position: fixed;
            bottom: env(safe-area-inset-bottom);
            left: 0;
            right: 0;
            padding: 12px 16px;
            font-size: 13px;
            color: var(--muted);
            background: linear-gradient(
              to top,
              rgba(255,255,255,0.96),
              rgba(255,255,255,0)
            );
          }
          `}
      </style>

      <main className='signin-container'>
        <img
          src={appData?.appLogo}
          alt='Digibot'
          className='h-20px h-lg-30px app-sidebar-logo-default'
        />

        <h1>Signing you in</h1>

        <p>
          If the app doesn’t open automatically,
          <br />
          <strong style={{cursor: 'pointer', color: '#2563eb'}} onClick={() => navigate('/')}>
            Click Here
          </strong>
        </p>

        <div className='spinner' aria-hidden='true' />
      </main>

      <footer>Secure sign-in • Digibot</footer>
    </>
  )
}

export default SignInPage

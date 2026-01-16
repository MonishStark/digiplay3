import { Fade } from '@mui/material';
import { Alert } from 'react-bootstrap';


interface Alerts {
    checked: boolean
    message: string
}

export function AlertSuccess(props: Alerts) {
    return (
        <Fade in={props.checked}>
            <Alert variant="success" id="alert" >
                {props.message}
            </Alert>
        </Fade>
    )
}

export function AlertDanger(props: Alerts) {
    return (
        <Fade in={props.checked}>
            <Alert variant="danger" id="alert" >
                {props.message}
            </Alert>
        </Fade>
    )
}

export function AlertInfoLoading(props: Alerts) {
    return (
        <Fade in={props.checked}>
            <>
                <Alert variant="primary" id="alert" >
                    {props.message}
                </Alert>
            </>
        </Fade>
    )
}
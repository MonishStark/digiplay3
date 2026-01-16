import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    getDocxFile,
    getDocFile,
    getXlsxFile,
    getXlsFile,
    getPDFFile,
    getTextFile,
    getHTMLFile
} from "../api";
import { useAuth } from "../../auth";

const DocumentViewer = () => {
    const params = new URLSearchParams(window.location.search);
    const team = params.get("team")
    const parent = params.get("parent")
    const id = params.get("id")
    const type = params.get("type")
    const name = params.get("name")

    const [currentTeam] = useState(team ? team : null)
    const [currentParent] = useState(parent ? parent : null)
    const [fileId] = useState(id ? id : null)
    const [fileType] = useState<any>(type ? type : null)
    const [fileName] = useState<any>(name ? name : null)

    const [loading, setLoading] = useState<boolean>(true)
    const [selectedDocs, setSelectedDocs] = useState<Array<any>>([])
    const navigate = useNavigate()
    const { setIsBackFromPages, isBackFromPages, setCurrentTeam } = useAuth()

    useEffect(() => {
        if (isBackFromPages) {
            navigate('/dashboard', { state: currentParent })
        }
    }, [isBackFromPages])

    useEffect(() => {
        if (currentTeam && fileId) {
            if (fileType == 'docx') {
                getDocxFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
                        setSelectedDocs([file])
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'doc') {
                getDocFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/msword' })
                        setSelectedDocs([file])
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'xlsx') {
                getXlsxFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                        setSelectedDocs([file])
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'xls') {
                getXlsFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/vnd.ms-excel' })
                        setSelectedDocs([file])
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'pdf') {
                getPDFFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/pdf' })
                        setSelectedDocs([file])
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'txt') {
                getTextFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'text/plain;charset=utf-8' })
                        setSelectedDocs([file])
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'html') {
                getHTMLFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'text/html' })
                        setSelectedDocs([file])
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            }
            setCurrentTeam(team)
        }
    }, [])

    return !loading &&
                (<>
                    {fileType == 'docx' || fileType == 'xlsx' ? (
                        <div className='alert alert-warning show' >
                            <div className='d-flex justify-content-center'>
                                <p className='my-auto me-3'>
                                    Preview unavailable for MS office documents, but you can export and view it.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <DocViewer
                            documents={selectedDocs.map((file) => ({
                                uri: window.URL.createObjectURL(file),
                                fileName: fileName,
                            }))}
                            pluginRenderers={DocViewerRenderers}
                        />
                    )}
                    <div className="d-flex flex-center mt-5">
                        <a
                            className={'btn btn-sm btn-flex fw-bold btn-primary'}
                            onClick={() => {
                                navigate("/files")
                                setIsBackFromPages(true)
                            }}
                        >
                            Go Back
                        </a>
                    </div>
                </>)
}

export { DocumentViewer }
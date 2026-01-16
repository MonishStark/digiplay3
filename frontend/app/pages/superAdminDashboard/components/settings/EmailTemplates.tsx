import { FormattedMessage } from 'react-intl'
import { KTCard, KTIcon, toAbsoluteUrl } from '../../../../../app/theme/helpers'
import { useEffect, useState } from 'react'
import { getTemplates } from '../../api'
import { useNavigate } from 'react-router-dom'

const svgMap: any = {
    'pdf': '/media/svg/files/pdf.svg',
    'docx': '/media/svg/files/doc.svg',
    'xlsx': '/media/svg/files/xlsx.svg',
    'txt': '/media/svg/files/txt.svg',
    'doc': '/media/svg/files/doc.svg',
    'xls': '/media/svg/files/xls.svg',
    'pptx': '/media/svg/files/pptx.svg',
    'html': '/media/svg/files/files.svg'
}

const EmailTemplates = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any>([])

  useEffect(() => {
    const fetchTemplates = async () => {
        try {
            const res: any = await getTemplates()
            if(res.data.success == true) {
                setTemplates(res.data.templates)
            }

        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    };

    fetchTemplates();
}, [])

const isMSOfficeDocuments = (fileType: string) => {
    return fileType == 'docx' || fileType == 'xlsx' || fileType == 'doc' || fileType == 'pptx' || fileType == 'xls'
}

const openDocumentViewer = (id: number, type: string, name: string, template:string, subject:string) => {
    if (!isMSOfficeDocuments(type)) {
      if (type == 'html') {
        navigate('/admin/update-email-template', {
          state: {
            currentTeam: null,
            currentParent: null,
            folderTree: null,
            fileId: id,
            fileName: name,
            fileContent: template,
            subject: subject
          }
        })
      } 
    }
}

  const createOpenDocumentHandler = (
    id: number,
    type: string,
    name: string,
    template: string,
    subject: string
  ) => {
    return () => openDocumentViewer(id, type, name, template, subject);
  };

  return (
    <>
      {!loading ? (
        <KTCard>
          <div id="clients-table" className="card" style={{ overflowX: 'auto' }}>
            <div className="card-body">
              <table className="table mb-10 align-middle table-row-dashed fs-6 gy-5 px-3" id="kt_table_users">
                <thead className="pe-5">
                  <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">
                    <th className="min-w-50px"><FormattedMessage id="DOCUMENT.TABLE.NAME" /></th>
                    <th className='min-w-100px text-end'><FormattedMessage id='TEAM.ACTIONS' /></th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 fw-bold">
                  <>
                    {templates?.map((data: any) => (
                      <>
                        <tr key={data?.id}>
                          <td className="text-gray-800 text-start">
                            <div className='d-flex align-items-center'>
                            <div className='symbol symbol-circle symbol-50px overflow-hidden me-3'>
                                <span>
                                    <span className='symbol symbol-30px my-auto'>
                                    <img src={toAbsoluteUrl(svgMap['html'])} alt='extension' />
                                    </span>
                                </span>
                            </div>
                            <div className='d-flex flex-column'>
                                <span className='text-gray-800 text-hoverprimary mb-1'>
                                {data?.name}
                                </span>
                            </div>
                            </div>
                          </td>
                          <td>
                            <div className='d-flex justify-content-end flex-shrink-0'>
                                <>
                                <span
                                className='me-2 btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                                onClick={createOpenDocumentHandler(data.id, "html", data.name, data.template, data.subject)}
                                data-bs-toggle="tooltip"
                                title="View File"
                                >
                                <KTIcon
                                    iconName='pencil'
                                    className='fs-3 text-dark'
                                />
                                </span>
                                </>
                            </div>
                          </td>
                        </tr>
                      </>
                    ))}
                  </>
                </tbody>
              </table>
            </div>
          </div>
        </KTCard>
      ) : (
        <div className='d-flex justify-content-center mx-auto my-auto'>
          <div className='w-50px h-50px'>
            <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
          </div>
        </div>
      )}
    </>
  )
}

export { EmailTemplates }
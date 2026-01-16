import { INTEGRATION_CONFIGS } from '../constants';

interface IntegrationButtonProps {
  integration: keyof typeof INTEGRATION_CONFIGS;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
}

export const IntegrationButton = ({
  integration,
  loading,
  disabled,
  onClick,
  title
}: IntegrationButtonProps) => {
  const config = INTEGRATION_CONFIGS[integration];

  return (
    <div className="ms-5" title={title}>
      <button
        className={`btn btn-sm btn-flex fw-bold mt-5 ${loading ? 'btn-secondary' : 'btn-primary'}`}
        onClick={onClick}
        disabled={disabled || loading}
      >
        <i className={config.icon} style={{ fontSize: config.size }} />
      </button>
    </div>
  );
};
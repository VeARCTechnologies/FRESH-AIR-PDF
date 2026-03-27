/**
 * ValidationBanner Component
 *
 * Red warning banner shown when fields are not mapped to system fields.
 */

interface ValidationBannerProps {
  unmappedCount: number
  onDismiss?: () => void
}

export function ValidationBanner({ unmappedCount, onDismiss }: ValidationBannerProps) {
  if (unmappedCount === 0) return null

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <i className="fas fa-exclamation-triangle" style={styles.icon} />
        <span style={styles.text}>
          {unmappedCount} field{unmappedCount > 1 ? 's are' : ' is'} not mapped to a system field.
          Please map all fields before saving.
        </span>
      </div>
      {onDismiss && (
        <button style={styles.closeButton} onClick={onDismiss} title="Dismiss">
          <i className="fas fa-times" />
        </button>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: '#FFEBEE',
    borderBottom: '1px solid #FFCDD2',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    color: '#C62828',
    fontSize: 14,
  },
  text: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: 500,
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#C62828',
    fontSize: 14,
    cursor: 'pointer',
  },
}

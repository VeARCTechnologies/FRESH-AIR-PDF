/**
 * ReadOnlyBanner Component
 *
 * Blue info banner shown when the template is in read-only mode.
 */

export function ReadOnlyBanner() {
  return (
    <div style={styles.banner}>
      <i className="fas fa-info-circle" style={styles.icon} />
      <span style={styles.text}>This template is in read-only mode</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: '#E3F2FD',
    borderBottom: '1px solid #BBDEFB',
    flexShrink: 0,
  },
  icon: {
    color: '#1565C0',
    fontSize: 14,
  },
  text: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: 500,
  },
}

/**
 * Search Panel Component
 * 
 * Text search interface with results list and navigation.
 */

import { useState } from 'react'
import type { SearchResult, SearchOptions } from '@/types'

interface SearchPanelProps {
  onSearch: (query: string, options: SearchOptions) => void
  onClearSearch: () => void
  onNavigateToResult: (result: SearchResult) => void
  results: SearchResult[]
  currentIndex: number
}

export function SearchPanel({
  onSearch,
  onClearSearch,
  onNavigateToResult,
  results,
  currentIndex,
}: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query, { caseSensitive, wholeWord })
    }
  }

  const handleClear = () => {
    setQuery('')
    onClearSearch()
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Search</h3>
        <button onClick={handleClear} style={styles.closeButton}>
          ×
        </button>
      </div>

      <form onSubmit={handleSearch} style={styles.form}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in document..."
          style={styles.input}
          autoFocus
        />
        
        <button type="submit" style={styles.searchButton}>
          Search
        </button>

        <div style={styles.options}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span style={styles.checkboxLabel}>Match case</span>
          </label>

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
            />
            <span style={styles.checkboxLabel}>Whole word</span>
          </label>
        </div>
      </form>

      {results.length > 0 && (
        <div style={styles.results}>
          <div style={styles.resultCount}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </div>

          <div style={styles.resultList}>
            {results.map((result, index) => (
              <div
                key={index}
                style={{
                  ...styles.resultItem,
                  ...(index === currentIndex ? styles.activeResult : {}),
                }}
                onClick={() => onNavigateToResult(result)}
              >
                <div style={styles.resultPage}>Page {result.pageNumber}</div>
                <div style={styles.resultText}>
                  {result.text.substring(0, 100)}
                  {result.text.length > 100 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {query && results.length === 0 && (
        <div style={styles.noResults}>No results found</div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#1e1e1e',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #404040',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: 0,
    width: '24px',
    height: '24px',
  },
  form: {
    padding: '16px',
    borderBottom: '1px solid #404040',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: '#2c2c2c',
    border: '1px solid #404040',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    marginBottom: '12px',
  },
  searchButton: {
    width: '100%',
    padding: '8px 16px',
    background: '#0066cc',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#ccc',
  },
  results: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  resultCount: {
    padding: '12px 16px',
    fontSize: '12px',
    color: '#999',
    borderBottom: '1px solid #404040',
  },
  resultList: {
    flex: 1,
    overflow: 'auto',
  },
  resultItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #2c2c2c',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  activeResult: {
    background: '#0066cc',
  },
  resultPage: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '4px',
  },
  resultText: {
    fontSize: '14px',
    color: '#ccc',
    lineHeight: '1.4',
  },
  noResults: {
    padding: '24px 16px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
  },
}

import { useEffect, useState } from 'react';
import LoginScreen from './components/LoginScreen';
import SearchBar from './components/SearchBar';
import StatsBar from './components/StatsBar';
import ResultCard from './components/ResultCard';
import Pagination from './components/Pagination';
import './App.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', period: 'morning' };
  if (h < 17) return { text: 'Good afternoon', period: 'afternoon' };
  return { text: 'Good evening', period: 'evening' };
}

const ITEMS_PER_PAGE = 10;

export default function App() {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'in' | 'out'
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [searchedZip, setSearchedZip] = useState('');
  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const greeting = getGreeting();

  useEffect(() => {
    fetch('/api/session', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        setAuthState(data.authenticated ? 'in' : 'out');
        setUserName(data.name || null);
      })
      .catch(() => setAuthState('out'));
  }, []);

  const handleLogout = async () => {
    setAuthState('out');
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Cookie may already be gone client-side reload; nothing actionable here.
    }
  };

  const handleSearch = async (zip) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSearchedZip(zip);
    setFilterNoWebsite(false);
    setCurrentPage(1);

    try {
      const base = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${base}/api/search`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode: zip }),
      });

      if (res.status === 401) {
        setAuthState('out');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setResults(data.results);
      }
    } catch {
      setError('Could not reach the server. Make sure the backend is running on port 4000.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterToggle = () => {
    setFilterNoWebsite((f) => !f);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredResults = filterNoWebsite
    ? results?.filter((r) => !r.hasWebsite)
    : results;

  const totalPages = filteredResults ? Math.ceil(filteredResults.length / ITEMS_PER_PAGE) : 0;
  const pagedResults = filteredResults?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (authState === 'checking') {
    return <div className="app" />;
  }

  if (authState === 'out') {
    return (
      <LoginScreen
        onSuccess={(name) => {
          setUserName(name);
          setAuthState('in');
        }}
      />
    );
  }

  return (
    <div className="app">
      <div className="top-bar">
        <p className={`greeting greeting-${greeting.period}`}>
          {greeting.text}
          {userName && (
            <>
              , <strong>{userName}</strong>
            </>
          )}
          .
        </p>
        <button className="signout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <header className="header">
        <span className="eyebrow">StoreFinder</span>
        <h1>Find self-storage<br />near any ZIP code.</h1>
        <p className="subtitle">
          Search thousands of facilities instantly. Discover properties
          without an online presence — your next opportunity.
        </p>
      </header>

      <section className="search-section">
        <SearchBar onSearch={handleSearch} loading={loading} />
        {error && (
          <div className="search-wrapper" style={{ marginTop: 16 }}>
            <div className="error-banner">
              <span>⚠</span> {error}
            </div>
          </div>
        )}
      </section>

      {(loading || results !== null) && (
        <section className="results-section">
          <div className="container">
            {loading && (
              <div className="loading-container">
                <div className="spinner" />
                <p>Searching near {searchedZip}…</p>
                <span className="loading-note">Fetching all available results — may take a few seconds</span>
              </div>
            )}

            {!loading && results !== null && (
              <>
                {results.length === 0 ? (
                  <div className="empty-state">
                    <h3>No results found</h3>
                    <p>No self-storage facilities found near {searchedZip}. Try a different ZIP code.</p>
                  </div>
                ) : (
                  <>
                    <StatsBar
                      results={results}
                      zipCode={searchedZip}
                      filterNoWebsite={filterNoWebsite}
                      onToggleFilter={handleFilterToggle}
                    />

                    {filteredResults.length === 0 ? (
                      <div className="empty-state">
                        <h3>All facilities here have websites</h3>
                        <p>Try a different ZIP code to find unlisted properties.</p>
                      </div>
                    ) : (
                      <>
                        <div className="results-grid">
                          {pagedResults.map((facility) => (
                            <ResultCard key={facility.id} facility={facility} />
                          ))}
                        </div>

                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <footer className="footer">
        StoreFinder &copy; {new Date().getFullYear()} &mdash; Powered by Google Places API
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { SearchIcon } from '../icons';

export default function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const zip = value.trim();
    if (/^\d{5}$/.test(zip)) {
      onSearch(zip);
    }
  };

  const handleChange = (e) => {
    setValue(e.target.value.replace(/\D/g, '').slice(0, 5));
  };

  const isValid = /^\d{5}$/.test(value.trim());

  return (
    <div className="search-wrapper">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder="Enter ZIP code"
          maxLength={5}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="search-btn" disabled={!isValid || loading}>
          {loading ? (
            <>
              <span className="btn-spinner" />
              Searching…
            </>
          ) : (
            <>
              <SearchIcon size={15} />
              Search
            </>
          )}
        </button>
      </form>
      <p className="hint">Enter any US ZIP code to find nearby self-storage facilities</p>
    </div>
  );
}

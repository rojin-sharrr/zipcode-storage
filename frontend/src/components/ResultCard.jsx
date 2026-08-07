import { MapPinIcon, PhoneIcon, GlobeIcon, ExternalLinkIcon, StarIcon, MapIcon, AlertIcon } from '../icons';

export default function ResultCard({ facility }) {
  const { name, address, phone, rating, totalRatings, hasWebsite, website, mapsUrl } = facility;

  return (
    <div className={`result-card${!hasWebsite ? ' no-website-card' : ''}`}>
      <div className="card-header">
        <h3 className="card-name">{name}</h3>
        <span className={`badge ${hasWebsite ? 'has-website' : 'no-website'}`}>
          {hasWebsite ? (
            <><GlobeIcon size={10} /> Has Website</>
          ) : (
            <><AlertIcon size={10} /> No Website</>
          )}
        </span>
      </div>

      <div className="card-details">
        <div className="detail-row">
          <MapPinIcon className="detail-icon" size={13} />
          <span>{address}</span>
        </div>

        <div className="detail-row">
          <PhoneIcon className="detail-icon" size={13} />
          {phone ? <span>{phone}</span> : <span className="muted">No phone listed</span>}
        </div>

        <div className="detail-row">
          <StarIcon size={13} className="detail-icon" />
          {rating ? (
            <span>
              {rating.toFixed(1)}{' '}
              <span className="muted" style={{ fontStyle: 'normal' }}>
                ({totalRatings.toLocaleString()} review{totalRatings !== 1 ? 's' : ''})
              </span>
            </span>
          ) : (
            <span className="muted">No ratings yet</span>
          )}
        </div>
      </div>

      <div className="card-actions">
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            <MapIcon size={12} /> Maps
          </a>
        )}
        {website ? (
          <a href={website} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <ExternalLinkIcon size={12} /> Visit Website
          </a>
        ) : (
          <span className="btn btn-no-site">
            <AlertIcon size={12} /> No Website
          </span>
        )}
      </div>
    </div>
  );
}

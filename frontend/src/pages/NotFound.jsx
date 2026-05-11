import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

const NotFound = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            padding: 'var(--space-8)'
        }}>
            <h1 style={{ fontSize: '6rem', fontWeight: '800', color: 'var(--teal)', margin: 0, lineHeight: 1 }}>
                404
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', margin: 'var(--space-4) 0 var(--space-6)' }}>
                This page does not exist.
            </p>
            <Link to="/" className="btn btn-primary">
                <FaHome style={{ marginRight: 'var(--space-2)' }} />
                Go Home
            </Link>
        </div>
    );
};

export default NotFound;

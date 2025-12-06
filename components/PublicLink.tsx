import React from 'react';
import { usePublicRouter } from '../context/PublicRouterContext';

interface PublicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
}

const PublicLink: React.FC<PublicLinkProps> = ({ href, children, className, onClick, ...props }) => {
    const { navigate } = usePublicRouter();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (onClick) {
            onClick(e);
        }
        navigate(href);
    };

    return (
        <a href={href} onClick={handleClick} className={className} {...props}>
            {children}
        </a>
    );
};

export default PublicLink;

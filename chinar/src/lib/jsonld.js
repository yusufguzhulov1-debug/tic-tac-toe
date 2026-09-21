import { toSchemaHours } from '../assets/js/lib/hours.js';

const clean = (obj) => {
  if (Array.isArray(obj)) return obj.map(clean).filter((v) => v !== undefined);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const value = clean(v);
      const empty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);
      if (!empty) out[k] = value;
    }
    return out;
  }
  return obj;
};

/**
 * schema.org graph for the home page: Restaurant + its Menu + WebSite.
 * Only fields that are actually filled in the content file are emitted —
 * an empty phone or a missing geo point is left out rather than faked.
 */
export function buildJsonLd(content, { siteUrl, pageUrl }) {
  const { brand, contacts, hours, menu, reservation } = content;
  const restaurantId = `${siteUrl}/#restaurant`;

  const restaurant = {
    '@type': 'Restaurant',
    '@id': restaurantId,
    name: brand.name,
    alternateName: brand.latinName,
    legalName: brand.legalName,
    description: brand.description,
    url: siteUrl,
    image: `${siteUrl}/${content.seo.ogImage}`,
    servesCuisine: brand.cuisines,
    priceRange: brand.priceRange,
    telephone: contacts.phoneHref ? `+${String(contacts.phoneHref).replace(/\D/g, '')}` : undefined,
    email: contacts.email || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contacts.address.street,
      addressLocality: contacts.address.city,
      addressRegion: contacts.address.region,
      postalCode: contacts.address.postalCode,
      addressCountry: contacts.address.country,
    },
    geo:
      contacts.geo?.lat && contacts.geo?.lng
        ? { '@type': 'GeoCoordinates', latitude: contacts.geo.lat, longitude: contacts.geo.lng }
        : undefined,
    openingHoursSpecification: toSchemaHours(hours),
    sameAs: (contacts.socials || []).map((s) => s.url).filter(Boolean),
    acceptsReservations: true,
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${pageUrl}#reserve` },
      result: { '@type': 'Reservation', name: reservation.title },
    },
    hasMenu: {
      '@type': 'Menu',
      name: menu.title,
      inLanguage: content.langTag,
      hasMenuSection: menu.categories.map((cat) => ({
        '@type': 'MenuSection',
        name: cat.title,
        description: cat.description,
        hasMenuItem: cat.items.map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          description: item.description,
          offers:
            item.price === null || item.price === undefined
              ? undefined
              : { '@type': 'Offer', price: item.price, priceCurrency: menu.currency },
        })),
      })),
    },
  };

  return clean({
    '@context': 'https://schema.org',
    '@graph': [
      restaurant,
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: brand.name,
        inLanguage: content.langTag,
        publisher: { '@id': restaurantId },
      },
      {
        '@type': 'WebPage',
        '@id': pageUrl,
        url: pageUrl,
        name: content.seo.title,
        description: content.seo.description,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': restaurantId },
        inLanguage: content.langTag,
      },
    ],
  });
}

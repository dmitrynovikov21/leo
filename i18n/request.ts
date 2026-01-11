import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;

    if (!locale || locale !== 'ru') {
        locale = 'ru';
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});

// https://www.youtube.com/watch?v=VoLhQS-hKOU
// https://www.youtube.com/watch?v=VoLhQS-hKOU

// Установлено ли PWA
export const isPWAInstalled = async () => {
    if('getInstalledRelatedApps' in navigator){
        // @ts-ignore
        const relatedApps = await navigator.getInstalledRelatedApps();
        return relatedApps.length > 0;
    }

    return false;
}

// Буффер обмена
export const paste = () => {
    document.addEventListener('paste', async (e) => {
        e.preventDefault();
        const clipboardItems: any = typeof navigator?.clipboard?.read === 'function'
            ? await navigator.clipboard.read()
            : e.clipboardData.files;
        for (const clipboardItem of clipboardItems) {
            let blob;
            if (clipboardItem.type?.startsWith('image/')) {
                blob = clipboardItem;
                // do something with blob
            } else {
                const imageTypes = clipboardItem.types?.filter((type) =>
                    type.startsWith('image/')
                );
                for (const imageType of imageTypes) {
                    blob = await clipboardItem.getType(imageType);
                    // do something with blob
                }
            }
        }
    });
}

// делиться
export const PWAShare = () => {
    const getBlobFromImage = (): any => {

    }
    const shareButton = document.querySelector('.button');
    if (navigator.canShare) {
        shareButton.addEventListener('click', async () => {
            const blob = getBlobFromImage();
            const file = new File([blob], 'token.png', {
                type: 'image/png',
            });
            const data = {
                files: [file],
            };
            if (navigator.canShare(data)) {
                try {
                    await navigator.share(data);
                } catch (err: any) {
                    if (err.name !== 'AbortError') {
                        console.error(err.name, err.message);
                    }
                }
            }
        });
    }
}

// Получить файл в PWA
export const PWAuploadFile = () => {
    // sw.js
    self.addEventListener('fetch', (fetchEvent: any) => {
        const url = new URL(fetchEvent.request.url);
        if (
            url.pathname === '/' &&
            url.searchParams.has('share-target') &&
            fetchEvent.request.method === 'POST'
        ) {
            return fetchEvent.respondWith(
                (async () => {
                    const formData = await fetchEvent.request.formData();
                    const image = formData.get('image');
                    const keys = await caches.keys();
                    const sharedCache = await caches.open(
                        keys.filter((key) => key.startsWith('share-target'))[0]
                    );
                    await sharedCache.put('shared-image', new Response(image));
                    return Response.redirect('./?share-target', 303);
                })()
            );
        }
    });
    // main.js
    window.addEventListener('load', async () => {
        if (location.search.includes('share-target')) {
            const keys = await caches.keys();
            const sharedCache = await caches.open(
                keys.filter((key) => key.startsWith('share-target'))[0]
            );
            const image = await sharedCache.match('shared-image');
            if (image) {
                const blob = await image.blob();
                await sharedCache.delete('shared-image');
                // do something with blob
            }
        }
    });
}
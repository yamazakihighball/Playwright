const playwright = require('playwright');
const fs = require('fs-extra');

const web_domain = 'https://vibia.com/en/int/collections/';
const output_json = __dirname + '/vibia/';
const args = process.argv.slice(2);

if (args.length < 1) {
    console.error('Please provide a product URL suffix as an argument');
    process.exit(1);
}

const product_url = args[0];
const model_path = output_json + product_url + '.json';

console.log(web_domain + product_url);

async function main() {
    const browser = await playwright.chromium.launch({
        headless: true,
    });

    const page = await browser.newPage();
    await page.setDefaultTimeout(60000); // Increase default timeout to 60 seconds
    const response = await page.goto(web_domain + product_url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'page.png', fullPage: true });

    if (response.status() === 404) {
        console.log("Page not found");
        await browser.close();
        return;
    }

    try {
        // Extracting data
        const titles = await page.locator('h2').allInnerTexts();
        const title = titles[4] ? await titles[4] : 'Title not found';

        const paragraphs = await page.locator('p').allInnerTexts();
        const description = paragraphs[9] ? await paragraphs[9] : 'Description not found';

        // Extracting images
        const images = await page.locator('img').all();

        const imageUrls = [];
        for (const img of images) {
            const url = await img.getAttribute('src');
            if (url.toLowerCase().includes('productos') || url.toLowerCase().includes('inspirationalbook')) {
                imageUrls.push(url);
            }
        }

        //Extracting images for models with different colours
        const thumnailSelector = await page.locator('[data-qa="modelSelector"]').all();
        for (const thumbnail of thumnailSelector) {
            thumbnail.click();
            await page.waitForTimeout(3000);

            const colorOptions = page.locator('.colorOptions');
            await colorOptions.waitFor();
            const buttons = await colorOptions.locator('button').all();

            for (const color of buttons) {
                color.click();
                await page.waitForTimeout(3000);
                // console.log("button clicked =", await color.getAttribute('data-qa'));

                const modelImage = await page.locator('[data-qa="personalizationPlace"] img').getAttribute('src');
                // console.log("model image =", modelImage, "Type =", typeof modelImage);

                if(!imageUrls.includes(modelImage)) {
                    imageUrls.push(modelImage);
                }
            }
        }
        
        console.log("image URLS = ", imageUrls);

        //Extracting product codes for thumbnails
        const viewer = await page.locator('div.viewer[data-qa]').all();
        const productCodes = [];
        for (const div of viewer) {
            const modelNumber = await div.getAttribute('data-qa');
            if (modelNumber) {
                let productCode = modelNumber.replace('model-', '');
                productCodes.push(productCode);
            }
        }

        // Assigning titles to images
        const titledImages = {};
        // let bannerAssigned = false;
        let bannerCounter = 1;
        let imageCounter = 1;

        for (let i = 0; i < imageUrls.length; i++) {
            let title;
            if (imageUrls[i].toLowerCase().includes('productos') && imageUrls[i].toLowerCase().includes('slide')) {
                title = `Banner ${bannerCounter}`;
                bannerCounter++;
                titledImages[title] = imageUrls[i];
            } else if (imageUrls[i].toLowerCase().includes('inspirationalbook')) {
                // Assign "Image 1", "Image 2", etc. to all other images
                title = `Image ${imageCounter}`;
                imageCounter++;
                titledImages[title] = imageUrls[i];
            } else {
                for (const code of productCodes) {
                    if (imageUrls[i].toLowerCase().includes(`/${code.toLowerCase()}/`)) {
                        if (!titledImages[code]) {
                            titledImages[code] = [];
                        }
                        titledImages[code].push(imageUrls[i]);
                        break;
                    }
                }
            }
        }

        // If Banner or Technical Drawing weren't assigned, use the next available "Image" number
        // if (!bannerAssigned) {
        //     titledImages['Banner'] = titledImages[`Image ${imageCounter - 1}`];
        //     delete titledImages[`Image ${imageCounter - 1}`];
        //     imageCounter--;
        // }

        const modelPage = {
            title,
            description,
            images: titledImages
        };

        await page.waitForTimeout(5000);
        await browser.close();

        console.log(JSON.stringify(modelPage, null, 2));

        // Create File
        fs.ensureFile(model_path).then(() => {
            fs.writeJson(model_path, modelPage, { spaces: '\t' }).then(() => {
                console.log(product_url + ' is now scraped!');
            }).catch(err => {
                console.log(err);
            });
        }).catch(err => {
            console.log(err);
        });

    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('Target closed')) {
            console.error('The page was closed unexpectedly. This might be due to a navigation or timeout issue.');
        }
        await browser.close();
    }
}

main();
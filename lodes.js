const playwright = require('playwright');
const fs = require('fs-extra');

const args = process.argv.slice(2);
const product_url = args[0];
const web_domain = `https://www.lodes.com/en/products/${product_url}/?code=rw`;
const output_json = __dirname + '/lodes/';

if (args.length < 1) {
    console.error('Please provide a product URL suffix as an argument');
    process.exit(1);
}

const model_path = output_json + product_url + '.json';

console.log(web_domain + product_url);

async function main() {
    const browser = await playwright.chromium.launch({
        headless: true,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000); // Increase default timeout to 60 seconds
    await page.goto(web_domain, { waitUntil: 'networkidle' });

    try {

        //Product Description
        const description_inner_texts = await page.locator('div.font26.serif.text-more').allInnerTexts();
        const description = description_inner_texts.join('\n').replace(/\n\s*\n/g, '\n\n').trim();

        console.log(description);

        //Gallery images
        const gallery = [];

        const images = await page.locator('.img-gallery img').all();

        for (const image of images) {
            const url = await image.getAttribute('src');
            gallery.push(url);
        }

        console.log(gallery);

        //Variant info
        const products = {};

        const variationsCount = await page.locator('div.left.col25.font26.serif').count();
        console.log(variationsCount);
        
        for (let v = 0; v < variationsCount; v++) {
            const variation_name = await page.locator('div.left.col25.font26.serif').nth(v).innerText();

            //Downloads
            let specs_sheet = null;
            const specsLocator = page.locator('[data-name="Scheda prodotto"]').nth(v);
            if (await specsLocator.count() > 0) {
                try {
                    specs_sheet = await specsLocator.getAttribute('href', { timeout: 1000 });
                } catch (e) {
                    specs_sheet = null;
                }
            }

            let assembly_instruction = null;
            const assemblyLocator = page.locator('[data-name="Istruzioni montaggio"]').nth(v);
            if (await assemblyLocator.count() > 0) {
                try {
                    assembly_instruction = await assemblyLocator.getAttribute('href', { timeout: 1000 });
                } catch (e) {
                    assembly_instruction = null;
                }
            }

            let photometric_diagram = null;
            const diagramLocator = page.locator('[data-name="Diagramma polare"]').nth(v);
            if (await diagramLocator.count() > 0) {
                try {
                    photometric_diagram = await diagramLocator.getAttribute('href', { timeout: 1000 });
                } catch (e) {
                    photometric_diagram = null;
                }
            }

            let diagram_2d = null;
            const diagram2dLocator = page.locator('[data-name="Disegno 2d"]').nth(v);
            if (await diagram2dLocator.count() > 0) {
                try {
                    diagram_2d = await diagram2dLocator.getAttribute('href', { timeout: 1000 });
                } catch (e) {
                    diagram_2d = null;
                }
            }

            let diagram_3d = null;
            const diagram3dLocator = page.locator('[data-name="Disegno 3d"]').nth(v);
            if (await diagram3dLocator.count() > 0) {
                try {
                    diagram_3d = await diagram3dLocator.getAttribute('href', { timeout: 1000 });
                } catch (e) {
                    diagram_3d = null;
                }
            }

            console.log(specs_sheet);
            console.log(assembly_instruction);
            console.log(photometric_diagram);
            console.log(diagram_2d);
            console.log(diagram_3d);

            //light source more accurate
            const light_source = await page.locator('div.body-variante').nth(v).locator('div.single-lampadina').allInnerTexts();
            console.log(light_source);

            //sku w colours and materials
            const skus = {};
            const codes_count = await page.locator('div.body-variante').nth(v).locator('td.codes').count();
            console.log(codes_count);

            for (let c = 0; c < codes_count; c++) {
                //sku count
                const sku_count = await page.locator('div.body-variante').nth(v).locator('td.codes').nth(c).locator('tr').count();
                console.log(sku_count);
                
                for (let s = 0; s < sku_count; s++) {

                    let metal = null;
                    let colour = null;

                    // Metal
                    const metalLocator = page.locator('div.body-variante').nth(v).locator('td.icons').nth(0).locator('tr').nth(s);
                    if (await metalLocator.count() > 0) {
                        try {
                            metal = await metalLocator.innerText({ timeout: 1000 }); // optional timeout
                        } catch (e) {
                            metal = null;
                        }
                    }

                    // Colour
                    const colourLocator = page.locator('div.body-variante').nth(v).locator('td.icons').nth(1).locator('tr').nth(s);
                    if (await colourLocator.count() > 0) {
                        try {
                            colour = await colourLocator.innerText({ timeout: 1000 });
                        } catch (e) {
                            colour = null;
                        }
                    }

                    const sku = await page.locator('div.body-variante').nth(v).locator('td.codes').nth(c).locator('tr').nth(s).innerText();

                    console.log(metal);
                    console.log(colour);
                    console.log(sku);

                    skus[sku] = {
                        metal,
                        colour
                    }
                }
            }

            products[variation_name] = {
                specs_sheet,
                assembly_instruction,
                photometric_diagram,
                diagram_2d,
                diagram_3d,
                light_source,
                skus,
            };
        }

        // console.log(products);



        //Thumbnail images
        const variation_images = {};

        const variation_values = await page.locator('div.filtri.variante-filter.up .fil_var').all();

        for (const value of variation_values) {
            await page.locator('div.filtri.variante-filter.up').click();
            await page.waitForTimeout(1000);

            const id = await value.getAttribute('data-id');
            const model = await value.innerText(); // or use another attribute if you prefer

            await value.click();
            console.log(`${id} clicked!`);

            const metal_values = await page.locator('div.filtri.struttura-filter.up .fil_var').all();

            const metalImagePairs = [];

            for (const metal of metal_values) {
                await page.locator('div.filtri.struttura-filter.up').click();
                await page.waitForTimeout(1000);

                await metal.click();
                console.log(`metal ${await metal.getAttribute('data-id')} clicked`);
                await page.waitForTimeout(1000);

                const thumbnail_image = await page.locator('div.image-container-configuratore').getAttribute('style');
                const imgUrl = thumbnail_image.match(/url\(["']?(.*?)["']?\)/)[1];

                const metal_name = await metal.innerText();

                metalImagePairs.push({
                    metal: metal_name,
                    image: imgUrl
                });
            }

            variation_images[model] = metalImagePairs;
        }

        console.log(variation_images);

        for (const model in products) {
            const variation = products[model];
            const images = variation_images[model];
        
            if (!images) continue; // Skip if no images found for this model
        
            for (const sku in variation.skus) {
                const skuData = variation.skus[sku];
        
                const match = images.find(img =>
                    img.metal.toLowerCase().trim() === skuData.metal.toLowerCase().trim()
                );
        
                if (match) {
                    skuData.image = match.image;
                } else {
                    console.warn(`No image match for ${model} - ${skuData.metal}`);
                }
            }
        }

        // let thumbnail_array = [];

        // Thumbnail images for all models, colours and structures // only just clicking through the colours not really storing data anywhere
        // const all_models = await page.locator('div.filtri.variante-filter.up .fil_var').all();
        // const all_structures = await page.locator('div.filtri.struttura-filter.up .fil_var').all();
        // const all_finishes = await page.locator('div.filtri.finitura3.up .fil_var').all();

        // console.log(all_models);
        // console.log(all_structures);
        // console.log(all_finishes);
        
        // for (const model of all_models) {
        //     await page.waitForTimeout(1000);
        //     await page.locator('div.filtri.variante-filter.up').click();
        //     console.log('variant filter clicked');
        //     await page.waitForTimeout(1000);
            
        //     const model_name = await model.innerText();

        //     await model.click();
        //     await page.waitForTimeout(1000);

        //     console.log(`${model_name} clicked!`);
            
        //     for (const structure of all_structures) {
        //         await page.locator('div.filtri.struttura-filter.up').click();
        //         await page.waitForTimeout(1000);
        //         console.log('structure filter clicked');

        //         const structure_name = await structure.innerText();

        //         await structure.click()
        //         console.log(`stucture: ${structure_name} clicked`);
        //         await page.waitForTimeout(1000);

                
        //         for (const finishes of all_finishes) {
        //             await page.locator('div.filtri.finitura3.up').click();
        //             console.log('finish filter clicked');
        //             await page.waitForTimeout(1000);

        //             const finish_name = await finishes.innerText();

        //             await finishes.click()
        //             await page.waitForTimeout(1000);

        //             const thumbnail_image = await page.locator('div.image-container-configuratore').getAttribute('style');
        //             const imgUrl = thumbnail_image.match(/url\(["']?(.*?)["']?\)/)[1];
        //         }
        //     }
        // }

        const modelPage = {
            description,
            gallery,
            products,
        }

        await browser.close();

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
};

main();
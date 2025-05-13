const playwright = require('playwright');
const fs = require('fs-extra')

const web_domain = 'https://www.oluce.com';
const output_json = __dirname + '/oluce-json/';

var model_page = [];
var args = process.argv.slice(2);
const subfamily = args[0];

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}

const checkDir = (path) => {
    return new Promise(function(resolve, reject) { 
        fs.ensureFile(path)
        .then(() => {
            resolve();
        }).catch((err) => {
            reject(err);
        })
    });
}

const jsonWrite = (path, content) => {
    console.log(path);
    return new Promise(function(resolve, reject) { 
        fs.writeJson(path, content, { spaces: '\t' })
        .then(() => {
            resolve();
        })
        .catch(err => {
            reject(err);
        })
    });
}

async function main() {
    const browser = await playwright.chromium.launch({
        headless: true
    });

    const page = await browser.newPage();
    await page.goto(web_domain + '/en/product/' + subfamily, { timeout: 9000000 });

    var filename = subfamily;
    var model_path = output_json + filename + '.json';
    
        var mainpage_info = [];    

        const code_name = filename;
        await page.waitForSelector('h2.title-prodotto');
        const main_name = (await page.locator("h2.title-prodotto", { timeout: 9000000 }).nth(0).textContent() + "").replace("\n", "").trim();
        const designer = (await page.locator("p.sottotitolo-prodotto", { timeout: 9000000 }).nth(0).textContent() + "").replace("\n", "").trim();
        const prod_desc = (await page.locator(".wpb_content_element div p", { timeout: 9000000 }).nth(1).textContent() + "").replace("\n", "").trim();

        mainpage_info.push({"Code Name": code_name, "Product Name": main_name, "Designer": designer, "Product Description": prod_desc});

        //console.log(mainpage_info);
        
            await page.waitForSelector('span.tp-thumb-image');
            const slide_count = await page.locator('span.tp-thumb-image', { timeout: 9000000 }).count();
            const sliders = await page.locator('span.tp-thumb-image', { timeout: 9000000 });

            var slider_imgs = [];
            for (var x=0; x < slide_count; x++) {
                const raw_slider = await sliders.nth(x).getAttribute('style');
                const slider = raw_slider.replace("background-image: url(\"","").replace("\");","").trim();
                slider_imgs.push({"Image": slider});
            } 
    

        console.log(slider_imgs);

        // Technical Data Extract
        const count_of_tech_data = await page.locator('.vc_row.wpb_row.vc_inner.vc_row-fluid .vc_column-inner .wpb_wrapper h4 + p', { timeout: 9000000 }).count();
        //const tech_data_heading = await page.locator('.vc_row.wpb_row.vc_inner.vc_row-fluid .vc_column-inner .wpb_wrapper h3', { timeout: 9000000 });
        const tech_data_desc = await page.locator('.vc_row.wpb_row.vc_inner.vc_row-fluid .vc_column-inner .wpb_wrapper h4 + p', { timeout: 9000000 });
        const tech_data_img = await page.locator('div.vc_single_image-wrapper img', { timeout: 9000000 });

        // console.log(count_of_tech_data);
        
        var technical_data = []
        for (var n=0; n < count_of_tech_data; n++) {
            //const headingtitle = (await tech_data_heading.nth(n).textContent() + "").replace("\n", "").trim();
            const headingdesc = (await tech_data_desc.nth(n).textContent() + "").replace("\n", "").trim();
            const headingimg = await tech_data_img.getAttribute('data-src');

            technical_data.push({
                //"Heading Title": headingtitle
                "Heading Desc": headingdesc, "Heading Image": headingimg});
        }

       console.log(technical_data);
       var tech_info = await page.locator('tbody#GRID_LAMP_DATA_TABLE tr td').count();
       console.log({tech_info});
       await page.waitForSelector('tbody#GRID_LAMP_DATA_TABLE tr td');
       const count_of_tech_info = await page.locator('tbody#GRID_LAMP_DATA_TABLE tr td', { timeout: 9000000 }).count();

       console.log({count_of_tech_info});

        var technical_info = []
        for (var a=0; a < count_of_tech_info; a++) {
            try {
                const tech_info_code = (await page.locator("tbody#GRID_LAMP_DATA_TABLE tr td", { timeout: 9000000 }).nth(a).textContent() + "").replace("\n", "").trim();
                var a = a + 1;
                const tech_info_sourcebulbs = (await page.locator("tbody#GRID_LAMP_DATA_TABLE tr td", { timeout: 9000000 }).nth(a).textContent() + "").replace("\n", "").trim();
                var a = a + 1;
                const tech_info_materias = (await page.locator("tbody#GRID_LAMP_DATA_TABLE tr td", { timeout: 9000000 }).nth(a).textContent() + "").replace("\n", "").trim();
                var a = a + 1;
                const tech_info_colors = (await page.locator("tbody#GRID_LAMP_DATA_TABLE tr td", { timeout: 9000000 }).nth(a).textContent() + "").replace("\n", "").trim();
                var a = a + 1;
                technical_info.push({ "Technical Information Code": tech_info_code, "Technical Information Source Bulb": tech_info_sourcebulbs, "Technical Information Materia": tech_info_materias, "Technical Information Color": tech_info_colors });                    
            } catch {
                
            }
            
        }
        // console.log(technical_info);

        const count_of_tech_drawings = await page.locator('tbody#GRID_LAMP_MODELS_TABLE tr td', { timeout: 9000000 }).count();
        const tech_drawing_links = await page.locator('tbody#GRID_LAMP_MODELS_TABLE tr td a', { timeout: 9000000 });
        const count_tech_drawing_links = await page.locator('tbody#GRID_LAMP_MODELS_TABLE tr td a', { timeout: 9000000 }).count();

       
        console.log({ count_of_tech_drawings });


       var technical_drawings = []
        for (var b = 1; b < count_of_tech_drawings; b++) {
            console.log('----');
            // const tech_drawings_code = (await page.locator("tbody#GRID_LAMP_MODELS_TABLE tr td", { timeout: 9000000 }).nth(b - 1).textContent() + "").replace("\n", "").trim();
            const tech_drawings_code = (await page.locator("tbody#GRID_LAMP_MODELS_TABLE tr td img", { timeout: 9000000 }).nth(b - 1).getAttribute('alt'));
            const drawings_title = await tech_drawings_code.replace("Download ", "");
            const tech_drawings_href = await tech_drawing_links.nth(b-1).getAttribute('href');
            // const tech_drawings_2dmodel = await tech_drawing_links.nth(b).getAttribute('href');
            // const tech_drawings_3dmodeldwg = await tech_drawing_links.nth(b + 1).getAttribute('href');
            // const tech_drawings_3dmodel3ds = await tech_drawing_links.nth(b + 2).getAttribute('href');
            console.log('----');
        
            // technical_drawings.push({"Technical Drawing Code": tech_drawings_code, "Technical Drawing 2D Model DWG": tech_drawings_2dmodel, 
            // "Technical Drawing 3D Model DWG": tech_drawings_3dmodeldwg, 
            // "Technical Drawing 3D Model 3DS": tech_drawings_3dmodel3ds
            // });
            technical_drawings.push({ [drawings_title] : tech_drawings_href});
        }

        console.log(technical_drawings);

        const count_of_tech_sheet = await page.locator('tbody#GRID_LAMP_DTEC_TABLE tr td', { timeout: 9000000 }).count();
        // const tech_sheet_links = await page.locator('tbody#GRID_LAMP_DTEC_TABLE tr td + td a', { timeout: 9000000 });
       // const count_tech_drawing_links = await page.locator('tbody#GRID_LAMP_MODELS_TABLE tr td a', { timeout: 9000000 }).count();

       const number_of_tech_sheet = count_of_tech_sheet - 3;
       console.log({number_of_tech_sheet});

        var technical_sheet = []
        // //d = -3;
        // var w = 0;
        // for (var d=0; d < 2; d++) {
        //     const tech_sheet_code = (await page.locator("tbody#GRID_LAMP_DTEC_TABLE tr", { timeout: 9000000 }).nth(0).textContent() + "").replace("\n", "").trim();
        //     const tech_sheet_standard = await tech_sheet_links.nth(w).getAttribute('href');
        //     var w = w+1;
        //     //const tech_sheet_ULcert = await tech_sheet_links.nth(w).getAttribute('href');
        //     //var w = w+1;
        //     //var checktec = await tech_sheet_links.nth(w).isVisible();
        //     //var tech_sheet_CCCcert = "";
        //     //if (checktec) {
        //     //    tech_sheet_CCCcert = await tech_sheet_links.nth(w).getAttribute('href');
        //     //} 

        //     technical_sheet.push({"Technical Sheet Code": tech_sheet_code, 
        //     "Technical Sheet Standard": tech_sheet_standard,
        //     // "Technical Sheet UL Certification": tech_sheet_ULcert,
        //     // "Technical Sheet CCC Certifications": tech_sheet_CCCcert
        // });
        // }

        for (var i=0; i < number_of_tech_sheet; i++) {
            // const tech_sheet_code = await page.locator("tbody#GRID_LAMP_DTEC_TABLE tr", { timeout: 9000000 }).nth(i + 1).getAttribute('title');
            // console.log('tech_sheet_code', tech_sheet_code);
            // const tech_sheet_heading = await page.locator('tbody#GRID_LAMP_DTEC_TABLE tr td a img', { timeout: 9000000 }).nth(i +1);
            // console.log(tech_sheet_heading);
            const tech_sheet = await page.locator('tbody#GRID_LAMP_DTEC_TABLE tr td a', { timeout: 9000000 });
            const tech_sheet_href = await tech_sheet.nth(i).getAttribute('href');
            const tech_sheet_title = await page.locator('tbody#GRID_LAMP_DTEC_TABLE tr td a img', { timeout: 9000000 }).nth(i).getAttribute('title');
            const sheet_title = await tech_sheet_title.replace("Download ", "");

            technical_sheet.push({ [sheet_title] : tech_sheet_href});
        }

        console.log(technical_sheet);

        const count_of_downloads = await page.locator('div.kleo_text_column div.wpb_wrapper p a.valore-cf', { timeout: 9000000 }).count();
        const download_links = await page.locator('div.kleo_text_column div.wpb_wrapper p a.valore-cf', { timeout: 9000000 });

        var download_info = []
        for (var n=0; n < count_of_downloads; n++) {
            const link_title = (await page.locator("div.kleo_text_column div.wpb_wrapper p a.valore-cf", { timeout: 9000000 }).nth(n).textContent() + "").replace("\n", "").trim();
            const link_download = await download_links.nth(n).getAttribute('href');
            //const link_push = link_title.concat(link_download);
             
            download_info.push({[link_title]: link_download});
        }

        //console.log(download_info);

        model_page.push({mainpage_info, 
            slider_imgs, 
            technical_data, technical_info, technical_drawings, technical_sheet, download_info});

        console.log('model_page', model_page);

        await checkDir(model_path);
        await jsonWrite(model_path, model_page);

        await browser.close();

       
    }
 
    main();

// node oluce.js g-o-352
// node oluce.js g-o-252
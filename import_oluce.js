const fs = require('fs').promises;
const path = require('path');
// const axios = require('axios');

const full_path = path.join(__dirname, './oluce-json SEAN');

console.log("fullpath", full_path);

function clean(line) {
    return line
        .replace(/[↙➘]/g, '')
        .replace(/–/g, '-')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s{2,}/g, ' ');
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

function processValue(value) {
    if (value.toLowerCase() === "pendant") {
        return "Pendants";
    }
    return toTitleCase(value);
}

function readFileJson(file) {
    return require(path.join(full_path, file));
}

function parseLightingData(data) {
  const lightingData = {};

  // Wattage: match things like "13 W", "max 48 W", etc.
  const wattMatch = data.match(/(?:max\s*)?(\d+)\s*W/i);
  if (wattMatch) {
    lightingData.option_6 = wattMatch[1] + ' W';
  }

  // Bulb type/socket: G9, E14, or LED
  if (/G9/i.test(data)) {
    lightingData.option_3 = 'G9';
  } else if (/E14/i.test(data)) {
    lightingData.option_3 = 'E14';
  } else if (/LED/i.test(data)) {
    lightingData.option_3 = 'LED';
  }

  // Lumen: extract number before "lm"
  const lumenMatch = data.match(/(\d+)\s*lm/i);
  if (lumenMatch) {
    lightingData.volume = lumenMatch[1];
  }

  // CRI: e.g., "CRI>85"
  const criMatch = data.match(/CRI\s*>\s*(\d+)/i);
  if (criMatch) {
    lightingData.option_8 = `CRI>${criMatch[1]}`;
  }

  return lightingData;
}

async function processProductFiles() {
    try {
        const files = await fs.readdir(full_path);
        const productFiles = files.filter(f => f !== '.DS_Store');

        // console.log(productFiles);

        // Flatten all products to a queue for sequential API calls
        const productQueue = [];

        for (const file of productFiles) {
            let file_json = readFileJson(file);
            let path_name = file.replace('.json', '');

            const data = file_json[0];
            
            for (const sku of data.technical_info[0]['Technical Information Color']) {
                let product = { page_status: 'Live', path_name: path_name };
                // console.log(sku);
                product.page_name = path_name + ' ' + sku.Code;
                product.title = path_name + ' ' + sku.Code;
                product.sku = sku.Code;
                product.colour = toTitleCase(sku.Colour);
                product.Code = data.technical_info[0]['Technical Information Code'];


                //main page info
                let product_tags = ['Oluce', sku.Code, 'Indoor', data.mainpage_info[0]['Style'], '2025'];
                product.tags = product_tags.join(',');
                product.related_tags = product_tags.join(',');
                product.item_vendor = 'Oluce';
                product.brand = 'Oluce';
                product.summary = data.mainpage_info[0]['Product Description'];
                product.meta_description = data.mainpage_info[0]['Product Description'];
                product.description = data.mainpage_info[0]['Product Description'];
                

                // //technical data and downloads
                if (data.technical_data.length > 0) {
                    product.image_url_3 = data.technical_data[0]['Heading Image'];
                    // console.log(data.technical_data[0]['Heading Image']);
                }
                product.material = data.technical_info[0]['Technical Information Materia'];

                product.related_file_1 = data.technical_sheet[0]['Standard Technical Data'];
                product.related_file_2 = data.technical_drawings[0]['2D models - DWG'];
                product.related_file_3 = data.technical_drawings[1]['3D models - DWG'];
                product.related_file_6 = data.download_info[1]['Assembly Instructions'];

                for (const [key] of Object.entries(data.technical_drawings[2])) {
                    // console.log(`${key}`);
                    //product.relate_file_ = data.technical_drawings[1][`${key}`];
                }

                if (data.download_info[0]['Product details']) {
                    //product.relate_file_ = data.download_info[0]['Product details'];
                }
                
                if (data.download_info[0]['Assembly Instructions – UL certification']) {
                    //product.relate_file_ = data.download_info[0]['Assembly Instructions – UL certification'];
                }


                // lighting parse
                const lightingData = data.technical_info[0]['Technical Information Source Bulb'];
                const dataParsed = parseLightingData(lightingData);
                // console.log(dataParsed);
                product.option_6 = dataParsed.option_6;
                product.option_3 = dataParsed.option_3;
                
                if (dataParsed.volume) {
                    product.volume = dataParsed.volume;
                }

                if (dataParsed.option_8) {
                    product.option_8 = dataParsed.option_8;
                }


                //slider images
                data.slider_imgs.forEach((item, index) => {
                    if (index === 0) {
                        product['image_url_1'] = item.Image;
                    } else {
                        product[`gallery_image_${index + 1}`] = item.Image;
                    }
                });


                // Add to queue for API posting
                productQueue.push(product);
            }
        } 

        console.log(productQueue);

        // // Sequentially post products with 2s delay
        // await postProductsWithInterval(productQueue, 1000);

    } catch (err) {
        console.error(err);
    }
}

// async function postProductsWithInterval(products, delayMs) {
//     for (let i = 0; i < products.length; i++) {
//         const product = products[i];
//         console.log(`Posting: ${product.url}`);

//         try {
//             // Uncomment to actually send to API
//             await axios({
//                 url: 'https://eustage.moble.site/api/product',
//                 method: 'post',
//                 headers: {
//                     'mobleapikey': 'ak_2d9ad56e7b9d530fe4038a0c6097b3bd40fc3e7a8a46cae5e5c3c56dad39c57f',
//                     'Content-Type': 'application/json'
//                 },
//                 data: product
//             });
//         } catch (err) {
//             console.error(`Failed to post ${product.url}:`, err.message);
//         }

//         if (i < products.length - 1) {
//             await new Promise(res => setTimeout(res, delayMs));
//         }
//     }
// }

processProductFiles();
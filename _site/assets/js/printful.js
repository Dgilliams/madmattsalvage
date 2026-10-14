// var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var request = new XMLHttpRequest();

//PROD
var productEndpoint = "https://6392ozfl3a.execute-api.us-east-1.amazonaws.com/dev/getProducts";
var verifyProductUrl = "https://6392ozfl3a.execute-api.us-east-1.amazonaws.com/dev/getProductVerification";

//DEV
// var productEndpoint = "https://ppsuaednkc.execute-api.us-east-1.amazonaws.com/dev/getProducts";
// var verifyProductUrl = "https://6392ozfl3a.execute-api.us-east-1.amazonaws.com/dev/getProductVerification";
var ALL_PRODUCTS = [];

function getProductsFromAws(){
  request.open("GET", productEndpoint, true);
  request.onreadystatechange = function()
  {
      if (this.readyState === this.DONE && this.status === 200)
      {
      	var myObject = JSON.parse(request.responseText);
        console.log(request.responseText);
        persistProductsResult(myObject);
        createProductList(myObject);
        hideProgressBar();
      } else {
      }
  }
  request.send();
}

function hideProgressBar(){
  document.getElementById('api-progress-bar').style.visibility = "hidden";
}

function persistProductsResult(products){
  ALL_PRODUCTS = products;
}

function createProductList(products) {
  if (isHtmlTemplatesSupported()){
    var shopList = document.getElementById('shop_list');
    for(var item in products) {
       var newShopItem = document.getElementById('shop_item_template').content.cloneNode(true);
       var newShopItemId = "shop_item_id:" + products[item].productId;
       newShopItem.querySelector(".post-card").id = newShopItemId;

       var buyButton = newShopItem.getElementById("buy_button_template");
       newShopItem.querySelector(".shop_item_title").innerText = products[item].name;

         for(let n in products[item].productVariantTOList){
           var thisVariant = products[item].productVariantTOList[n];
           var newBuyButtonId = thisVariant.productId + "-button";
           buyButton.id = newBuyButtonId;
           buyButton.dataset.itemId = thisVariant.syncVariantId;
           buyButton.dataset.itemName = thisVariant.name;
           buyButton.dataset.itemPrice = thisVariant.price;
           buyButton.dataset.itemUrl =  verifyProductUrl;
           buyButton.dataset.itemImage = thisVariant.files[1].preview_url;
           buyButton.dataset.itemDescription = thisVariant.name;

           var metadata = "{\"variant_id\":\"" + thisVariant.variantId + "\"}";
           buyButton.dataset.itemMetadata = metadata;

           var option = document.createElement("option");
           var optionText = "";

           if(thisVariant.color != null) {
             optionText += thisVariant.color;
           }
           if(thisVariant.size != null) {
             optionText += " Size: " + thisVariant.size;
           }
           option.text = optionText;
           option.value = thisVariant.syncVariantId;
           newShopItem.querySelector(".shop_item_select").add(option);
           newShopItem.querySelector(".shop_item_select").setAttribute("onchange", "updateProduct(\"" + newShopItemId + "\", this.value)");

           //default image to second file, generally the mockup "preview"
           var itemImage = thisVariant.files[1].preview_url;
           var itemImageWidth = thisVariant.files[1].width;

           //sometimes there are multiple images...
           for(var file in thisVariant.files){
             if(thisVariant.files[file].type.includes("preview")){
               itemImage = thisVariant.files[file].preview_url;
               itemImageWidth = thisVariant.files[file].width;
             }
           }
           newShopItem.querySelector(".shop_item_description").innerText = "$" + thisVariant.price;
           newShopItem.querySelector(".shop_item_image").src = itemImage;
           newShopItem.querySelector(".shop_item_image").width = itemImageWidth;
         }
         console.log("length: " + products[item].productVariantTOList.length);
         if(products[item].productVariantTOList.length == 1){
            newShopItem.querySelector(".shop_item_select").style.display = "none";
         }
         shopList.insertBefore(newShopItem, shopList.firstChild);
         updateProduct(newShopItemId, products[item].productVariantTOList[0].syncVariantId);
       }
    }
}

function updateProduct(shopItemId, syncVariantId){
  var productCard = document.getElementById(shopItemId);
  var thisVariant = getSyncVariantFromCache(syncVariantId);

  updateProductImage(productCard, thisVariant);
  updateBuyButton(productCard, thisVariant);
}

function updateProductImage(shopItem, thisVariant){
  //default image to second file, generally the mockup "preview"
  var itemImage = thisVariant.files[1].preview_url;
  var itemImageWidth = thisVariant.files[1].width;

  //sometimes there are multiple images...
  for(var file in thisVariant.files){
    if(thisVariant.files[file].type.includes("preview")){
      itemImage = thisVariant.files[file].preview_url;
      itemImageWidth = thisVariant.files[file].width;
    }
  }
  shopItem.querySelector(".shop_item_description").innerText = "$" + thisVariant.price;
  shopItem.querySelector(".shop_item_image").src = itemImage;
  shopItem.querySelector(".shop_item_image").width = itemImageWidth;
}

function updateBuyButton(shopItem, thisVariant){
  var button = document.getElementById(thisVariant.productId + "-button");
  console.log("buttonid: " + button.id);
  if(button != null){
    button.dataset.itemId = thisVariant.syncVariantId;
    button.dataset.itemName = thisVariant.name;
    button.dataset.itemPrice = thisVariant.price;
    button.dataset.itemUrl =  verifyProductUrl;
    button.dataset.itemImage = thisVariant.files[1].preview_url;
    button.dataset.itemDescription = thisVariant.name;
  }
}

function getSyncVariantFromCache(id){
  for(var x in ALL_PRODUCTS){
    for(var n in ALL_PRODUCTS[x].productVariantTOList){
      if(ALL_PRODUCTS[x].productVariantTOList[n].syncVariantId == id){
        return ALL_PRODUCTS[x].productVariantTOList[n];
      } else {
        console.log("product not found");
      }
    }
  }
}

function productInfo(variantId){
  this.variantId = variantId;
}

function isHtmlTemplatesSupported(){
  if ('content' in document.createElement('template')){
    return true;
  } else {
    return false;
  }
}

//GO! RUN! WOO!
//make promise
getProductsFromAws();

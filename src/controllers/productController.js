const productService = require("../services/productService");
const { generateItemsPDF } = require("../utils/pdfService");

// Controller to get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    if (!products) {
      return res
        .status(404)
        .json({ success: false, message: "No products found" });
    }
    res
      .status(200)
      .json({ success: true, message: "product fetch successful", products });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to insert a new product
const insertProduct = async (req, res) => {
  try {
    const productData = req.body;
    if (req.file) {
      // only save relative path in DB
      productData.ImageUrl = `/uploads/images/${req.file.filename}`;
    }

    // Parse BulkPricingTiers if it's a JSON string
    if (productData.BulkPricingTiers) {
      try {
        if (typeof productData.BulkPricingTiers === "string") {
          productData.BulkPricingTiers = JSON.parse(
            productData.BulkPricingTiers
          );
        }
        // Make sure it always an array
        if (!Array.isArray(productData.BulkPricingTiers)) {
          productData.BulkPricingTiers = [];
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid BulkPricingTiers format. Must be valid JSON.",
        });
      }
    } else {
      productData.BulkPricingTiers = [];
    }
    const newProduct = await productService.addProduct(productData);

    // create full URL only for response
    // const baseUrl = `${req.protocol}://${req.get("host")}`;
    // const responseProduct = {
    //   ...newProduct,
    //   ImageUrl: newProduct.ImageUrl ? `${baseUrl}${newProduct.ImageUrl}` : null,
    // };
    res.status(201).json({
      success: true,
      message: "Product inserted successfully",
      ItemID: newProduct.ItemID,
      // product: responseProduct,
    });
  } catch (err) {
    console.error("Error inserting product:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to update an existing product
const updateProduct = async (req, res) => {
  try {
    const productData = req.body;
    if (!productData.ItemID) {
      return res
        .status(400)
        .json({ success: false, message: "ItemID is required" });
    }

    // Handle image upload
    if (req.file) {
      productData.ImageUrl = `/uploads/images/${req.file.filename}`;
    } else {
      productData.ImageUrl = null; // let SQL handle ISNULL() so old image is kept
    }

    // Parse BulkPricingTiers if sent as string
    if (productData.BulkPricingTiers) {
      try {
        if (typeof productData.BulkPricingTiers === "string") {
          productData.BulkPricingTiers = JSON.parse(
            productData.BulkPricingTiers
          );
        }
        if (!Array.isArray(productData.BulkPricingTiers)) {
          productData.BulkPricingTiers = [];
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid BulkPricingTiers format. Must be valid JSON.",
        });
      }
    } else {
      productData.BulkPricingTiers = [];
    }

    // Call service
    const updated = await productService.updateProduct(productData);

    // Build full Image URL for response
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const responseProduct = {
      ...updated,
      ImageUrl: updated.ImageUrl ? `${baseUrl}${updated.ImageUrl}` : null,
    };

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      ItemID: updated.ItemID,
    });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Controller to get all categories
const allCategories = async (req, res) => {
  try {
    const categories = await productService.getAllCategories();
    if (!categories) {
      return res
        .status(404)
        .json({ success: true, message: "No categories found" });
    }
    res.status(200).json({
      success: true,
      message: "categories fetch successful",
      CategoriesCount: categories.length,
      categories,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to get products by category
const categoriesWiseProducts = async (req, res) => {
  try {
    const { CategoryId } = req.body;
    if (!CategoryId) {
      return res
        .status(400)
        .json({ success: false, message: "CategoryId is required" });
    }
    const categorieProducts = await productService.getCategoriesWithProducts(
      CategoryId
    );
    res.status(200).json({
      success: true,
      message: "categories fetch successful",
      ItemsCount: categorieProducts.length,
      categorieProducts,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to get product by ID
const getProductById = async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "ItemID is required",
      });
    }

    const product = await productService.getProductById(itemId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Controller to delete a product by ID
const deleteProduct = async (req, res) => {
  try {
    const { ItemID } = req.body;
    if (!ItemID) {
      return res.status(400).json({
        success: false,
        message: "ItemID is required",
      });
    }
    const deletedRows = await productService.deleteProductById(ItemID);
    if (deletedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or already deleted",
      });
    }
    res.status(200).json({
      success: true,
      message: "Product and its bulk pricing deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Controller to get product names and IDs
const productNameandID = async (req, res) => {
  try {
    const products = await productService.getproductNameandID();
    res
      .status(200)
      .json({
        success: true,
        message: products.length ? "product fetch successful" : "No products found",
        productCount: products.length,
        products,
      });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to generate PDF of all items
const allItemPDF = async (req, res) => {
  try {
    const items = await productService.generateAllItemsPDF(); 

    const pdfBuffer = await generateItemsPDF(items); // pass array directly
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="items_report_${Date.now()}.pdf"`
    );
    res.status(200).send(pdfBuffer);
      

    // res.status(200).json({
    //   success: true,
    //   message: "Items fetched successfully",
    //   totalRecords: items.length,
    //   data: items,
    // });
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  getAllProducts,
  insertProduct,
  updateProduct,
  allCategories,
  categoriesWiseProducts,
  getProductById,
  deleteProduct,
  productNameandID,
  allItemPDF,
};

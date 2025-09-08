# HEAD Hub - Product Tables Setup Guide

This guide explains how to set up and use the new product tables for all CSV data in the HEAD Hub application.

## Overview

The HEAD Hub now supports the following product categories:

### Original Categories
- **Accessories** - Poles, bags, and other accessories
- **Bindings** - Ski bindings
- **Boots** - Ski boots
- **Goggles** - Ski goggles
- **Helmets** - Ski helmets
- **Skis** - Ski equipment
- **Snowboards** - Snowboard equipment

### New Snowboard Categories
- **Snowboard Boots** - Snowboard-specific boots
- **Snowboard Accessories** - Snowboard bags and accessories
- **Snowboard Bindings** - Snowboard bindings
- **Snowboard Boards** - Snowboard boards

## Database Schema

### Table Structure

Each product table follows a consistent structure:

```sql
CREATE TABLE table_name (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'category_name',
    -- Category-specific fields --
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Product Category Enum

The `product_category` enum includes all supported categories:

```sql
CREATE TYPE product_category AS ENUM (
    'accessories', 'bindings', 'boots', 'goggles', 'helmet', 'ski', 'snowboard',
    'snowboard_boots', 'snowboard_accessories', 'snowboard_bindings', 'snowboard_boards'
);
```

## Setup Instructions

### 1. Environment Variables

Ensure you have the following environment variables set in your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Setup

Run the automated setup script:

```bash
node setup-database.js
```

This script will:
- Create all necessary database tables
- Set up Row Level Security (RLS) policies
- Import CSV data into the tables
- Verify the setup

### 3. Manual Setup (Alternative)

If you prefer to set up manually:

1. **Create Tables**: Execute the SQL files in order:
   ```bash
   # Execute in Supabase SQL editor or via psql
   psql -f database-schema.sql
   psql -f database-snowboard-tables.sql
   ```

2. **Import CSV Data**: Run the import script:
   ```bash
   cd app
   node import-csv-data.js
   ```

## API Endpoints

### Product Management

- **GET** `/api/admin/products` - List all products (admin only)
- **POST** `/api/admin/products` - Create new product (admin only)
- **PUT** `/api/admin/products` - Update product (admin only)
- **DELETE** `/api/admin/products` - Delete product (admin only)

### Equipment API

- **GET** `/api/equipment` - List products for equipment selection
- **GET** `/api/equipment/categories` - List available product categories

### Query Parameters

- `category` - Filter by product category
- `search` - Search by name or article number
- `page` - Page number for pagination
- `limit` - Number of items per page

## Order Integration

### Order Items Structure

Orders can now reference products from any category:

```typescript
interface OrderItem {
  id: string;
  order_id: string;
  product_category: ProductCategory;
  product_article: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
```

### Creating Orders

When creating orders, specify the product category and article:

```typescript
const orderItem = {
  product_category: 'snowboard_boots',
  product_article: '353613',
  quantity: 1,
  unit_price: 0, // Set by manager
  total_price: 0 // Calculated by manager
};
```

## Admin Panel

### Product Management

The admin panel (`/admin/product-management`) now supports:

- **All Product Categories**: View and manage products from all tables
- **Category Filtering**: Filter products by category
- **Search**: Search by product name or article number
- **CRUD Operations**: Create, read, update, and delete products
- **Bulk Operations**: Manage multiple products at once

### Category Management

Each category has its own section in the admin panel with category-specific fields:

- **Accessories**: Length, colors, diameter
- **Boots**: Flex, sizes, colors, shell type
- **Goggles**: Lens type, color, weather conditions
- **Helmets**: Sizes, colors, visor options
- **Skis**: Length, radius, sidecut, plate, bindings
- **Snowboards**: Shape, skill level, camber, architecture
- **Snowboard Boots**: Sizes, colors, flex, forward lean
- **Snowboard Accessories**: Colors, volume, dimensions
- **Snowboard Bindings**: Sizes, colors, skills, flex
- **Snowboard Boards**: Shape, skill, camber, architecture, flex, base

## Security

### Row Level Security (RLS)

All product tables have RLS enabled with the following policies:

- **Read Access**: All authenticated users can view active products
- **Write Access**: Only admins can create, update, or delete products
- **Admin Functions**: Helper functions for role checking

### Helper Functions

```sql
-- Check if user is admin
SELECT is_admin(auth.uid());

-- Check if user is manager or admin
SELECT is_manager_or_admin(auth.uid());

-- Get user role
SELECT get_user_role(auth.uid());
```

## CSV Data Format

### Required Fields

Each CSV file must have these columns:
- `article` - Unique product identifier (primary key)
- `name` - Product name

### Optional Fields

- `ver` - Version information
- `lang` - Language (defaults to 'EN')
- Category-specific fields as defined in the table schema

### CSV File Mapping

| CSV File | Database Table | Category |
|----------|----------------|----------|
| `accessories.csv` | `accessories` | `accessories` |
| `bindings.csv` | `bindings` | `bindings` |
| `boots.csv` | `boots` | `boots` |
| `goggles.csv` | `goggles` | `goggles` |
| `helmets.csv` | `helmet` | `helmet` |
| `skis.csv` | `ski` | `ski` |
| `snowboards_boots.csv` | `snowboards_boots` | `snowboard_boots` |
| `snowboards_accessories.csv` | `snowboards_accessories` | `snowboard_accessories` |
| `snowboards_bindings.csv` | `snowboards_bindings` | `snowboard_bindings` |
| `snowboards_boards.csv` | `snowboards_boards` | `snowboard_boards` |

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - Check that the service role key has the correct permissions

2. **Table Creation Errors**
   - Some "already exists" errors are expected and can be ignored
   - Check that the enum types are created before the tables

3. **CSV Import Errors**
   - Verify CSV files are in the correct format
   - Check that required fields (article, name) are present
   - Ensure CSV files are in the `csv/` directory

4. **Permission Errors**
   - Verify RLS policies are correctly set up
   - Check that user roles are properly assigned
   - Ensure admin functions are working correctly

### Verification Steps

1. **Check Tables**: Verify all tables exist in Supabase
2. **Check Data**: Verify CSV data was imported correctly
3. **Check Permissions**: Test admin and user access
4. **Check API**: Test API endpoints with different user roles
5. **Check UI**: Verify admin panel shows all categories

## Support

For issues or questions:

1. Check the application logs for error messages
2. Verify database permissions and RLS policies
3. Test with different user roles (admin, manager, athlete)
4. Check that all environment variables are set correctly

## Future Enhancements

Potential improvements for the product system:

- **Product Images**: Add image support for products
- **Pricing**: Add pricing information to products
- **Inventory**: Add stock/inventory tracking
- **Categories**: Add subcategories for better organization
- **Search**: Enhanced search with filters and sorting
- **Bulk Import**: Support for bulk product updates
- **Export**: Export product data to CSV/Excel
- **Analytics**: Product usage and order analytics

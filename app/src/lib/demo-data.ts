// Demo product data for testing without database
export const demoProducts = {
  accessories: [
    {
      id: 'demo-acc-1',
      article: '381305',
      name: 'Standard Carbon',
      category: 'accessories',
      diameter: 13,
      length: '105-135',
      colors: 'carbon/blue',
      is_active: true
    },
    {
      id: 'demo-acc-2',
      article: '381784',
      name: 'Porsche Carbon',
      category: 'accessories',
      diameter: 12.3,
      length: '105-140',
      colors: 'carbon/black/white',
      is_active: true
    }
  ],
  boots: [
    {
      id: 'demo-boot-1',
      article: '605001',
      name: 'RAPTOR M5 RV',
      category: 'boots',
      flex: '170/160',
      sizes: '225-235-….-285',
      colors: 'White',
      shell: 'Racing PU',
      is_active: true
    },
    {
      id: 'demo-boot-2',
      article: '605006',
      name: 'RAPTOR WCR 2 RV',
      category: 'boots',
      flex: '160/150',
      sizes: '225-235-….-285',
      colors: 'White',
      shell: 'Racing PU',
      is_active: true
    }
  ],
  skis: [
    {
      id: 'demo-ski-1',
      article: '313005',
      name: 'WCR e-GS Rebel FIS',
      category: 'skis',
      length: '183/188/193',
      radius: '30,5 @ Length 193',
      sidecut: '101/65/84 @ Length 193',
      is_active: true
    },
    {
      id: 'demo-ski-2',
      article: '313045',
      name: 'WCR e-GS Rebel',
      category: 'skis',
      length: '176/181/186/188',
      radius: '25,0 @ Length 181',
      sidecut: '102/65/86 @ Length 181',
      is_active: true
    }
  ],
  snowboards: [
    {
      id: 'demo-board-1',
      article: 'demo-sb-1',
      name: 'Demo Freeride Board',
      category: 'snowboards',
      shape: 'Directional',
      skill: 'Advanced',
      camber: 'Traditional',
      is_active: true
    }
  ],
  helmets: [
    {
      id: 'demo-helmet-1',
      article: 'demo-helmet-1',
      name: 'Demo Racing Helmet',
      category: 'helmets',
      sizes: 'S/M/L',
      colors: 'Black/White',
      is_active: true
    }
  ],
  goggles: [
    {
      id: 'demo-goggle-1',
      article: 'demo-goggle-1',
      name: 'Demo Racing Goggles',
      category: 'goggles',
      lens: 'Clear',
      color: 'Black',
      weather_condition: 'All conditions',
      is_active: true
    }
  ],
  bindings: [
    {
      id: 'demo-binding-1',
      article: 'demo-binding-1',
      name: 'Demo Racing Bindings',
      category: 'bindings',
      stand_height: 14,
      din: '3-12',
      weight: 450,
      is_active: true
    }
  ]
};

export const getAllDemoProducts = () => {
  return Object.values(demoProducts).flat();
};

export const getDemoProductsByCategory = (category: string) => {
  return demoProducts[category as keyof typeof demoProducts] || [];
};

export const searchDemoProducts = (query: string) => {
  const allProducts = getAllDemoProducts();
  const lowercaseQuery = query.toLowerCase();
  
  return allProducts.filter(product => 
    product.name.toLowerCase().includes(lowercaseQuery) ||
    product.article.toLowerCase().includes(lowercaseQuery)
  );
};

// import React from 'react';
// import { Product } from '../pages/InventoryPage';
// import { Image as ImageIcon, TrendingUp, TrendingDown } from 'lucide-react';

// interface ProductCardProps {
//   product: Product;
//   onViewHistory: (product: Product) => void;
//   onAdjustStock: (product: Product) => void;
// }

// const ProductCard: React.FC<ProductCardProps> = ({ product, onViewHistory, onAdjustStock }) => {
//   const stockStatus =
//     product.stock > 25
//       ? 'high'
//       : product.stock > 0
//       ? 'low'
//       : 'out';

//   const statusColors = {
//     high: {
//       text: 'text-green-600 dark:text-green-400',
//       bg: 'bg-green-500',
//       progressBar: 'bg-green-500',
//     },
//     low: {
//       text: 'text-orange-600 dark:text-orange-400',
//       bg: 'bg-orange-500',
//       progressBar: 'bg-orange-500',
//     },
//     out: {
//       text: 'text-red-600 dark:text-red-400',
//       bg: 'bg-red-500',
//       progressBar: 'bg-red-500',
//     },
//   };

//   const { text, bg, progressBar } = statusColors[stockStatus];

//   const lastUpdated = new Date(product.updatedAt).toLocaleDateString('en-US', {
//     month: 'short',
//     day: 'numeric',
//   });

//   return (
//     <div
//       onClick={() => onViewHistory(product)}
//       className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-600 transition-all duration-300 flex flex-col cursor-pointer group"
//     >
//       <div className="h-40 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
//         {product.imageUrl ? (
//           <img
//             src={product.imageUrl}
//             alt={product.productName}
//             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
//           />
//         ) : (
//           <div className="w-full h-full flex items-center justify-center">
//             <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-700" />
//           </div>
//         )}
//         <div className="absolute top-2 right-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">
//           ID: {product.productId}
//         </div>
//       </div>
//       <div className="p-4 flex flex-col flex-grow">
//         <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate flex-grow">
//           {product.productName}
//         </h3>
        
//         <div className="mt-4">
//           <div className="flex justify-between items-center mb-1">
//             <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock</span>
//             <span className={`text-lg font-bold ${text}`}>
//               {product.stock.toFixed(2)}
//               <span className="text-xs ml-1">{product.unit}</span>
//             </span>
//           </div>
//           <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
//             <div
//               className={`h-2.5 rounded-full ${progressBar}`}
//               style={{ width: `${Math.min(product.stock, 100)}%` }}
//             ></div>
//           </div>
//         </div>

//         <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-3">
//           <span>Last Updated</span>
//           <span>{lastUpdated}</span>
//         </div>
//       </div>
//       <div className="p-4 pt-0">
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               onAdjustStock(product);
//             }}
//             className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
//           >
//             <TrendingUp size={16} />
//             Adjust Stock
//           </button>
//       </div>
//     </div>
//   );
// };

// export default ProductCard;

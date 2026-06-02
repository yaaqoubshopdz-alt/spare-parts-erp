const fs = require('fs');
const path = 'src/features/inventory/components/InventoryCountTable.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace the empty state and filler rows block
const oldBlock = `          {!loading && items.length === 0 && (
            <tr><td colSpan={9} className="h-40 text-center text-text_muted text-sm py-16">لا توجد منتجات</td></tr>
          )}
          {items.map((item, idx) => (
            <InventoryCountTableRow
              key={item.id} item={item} idx={idx} page={page} limit={limit}
              isCounting={isCounting} editingQty={editingQty}
              onQtyChange={onQtyChange} onQtyKeyDown={onQtyKeyDown}
              onToggleHide={onToggleHide} onRowClick={onRowClick} togglingHideProductId={togglingHideProductId}
              columnWidths={columnWidths}
              isFocused={focusedIndex === idx}
            />
          ))}
          {/* Dynamic Filler rows (fixed height h-11, matching ERPTable) */}
          {!loading && fillerCount > 0 &&
            Array.from({ length: fillerCount }).map((_, i) => {
              const totalIdx = items.length + i;
              return (
                <tr key={\`filler-\${i}\`} className={\`h-11 \${totalIdx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg'}\`}>
                  <td style={{ width: columnWidths.index }} className={\`\${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.barcode_snapshot }} className={\`\${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.product_name_snapshot }} className={\`\${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.category_name_snapshot }} className={\`\${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.system_qty_at_start }} className={\`\${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.counted_qty }} className={\`\${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.final_difference }} className={\`\${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.status }} className={\`\${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.hide }} className={\`\${rowBorder}\`}>&nbsp;</td>
                </tr>
              );
            })
          }`;

const newBlock = `          {!loading && items.length === 0 && (
            <tr className="bg-background_secondary"><td colSpan={9} className="h-40 text-center text-text_muted text-sm py-16 border-b border-border_default">لا توجد منتجات</td></tr>
          )}
          {items.map((item, idx) => (
            <InventoryCountTableRow
              key={item.id} item={item} idx={idx} page={page} limit={limit}
              isCounting={isCounting} editingQty={editingQty}
              onQtyChange={onQtyChange} onQtyKeyDown={onQtyKeyDown}
              onToggleHide={onToggleHide} onRowClick={onRowClick} togglingHideProductId={togglingHideProductId}
              columnWidths={columnWidths}
              isFocused={focusedIndex === idx}
            />
          ))}
          {/* Dynamic Filler rows (fixed height h-11, matching ERPTable) */}
          {!loading && fillerCount > 0 &&
            Array.from({ length: fillerCount }).map((_, i) => {
              const totalIdx = items.length + i;
              const bg = totalIdx % 2 === 0 ? 'bg-background_secondary' : 'bg-sidebar_bg';
              return (
                <tr key={\`filler-\${i}\`} className={\`h-11 \${bg}\`}>
                  <td style={{ width: columnWidths.index }} className={\`\${bg} \${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.barcode_snapshot }} className={\`\${bg} \${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.product_name_snapshot }} className={\`\${bg} \${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.category_name_snapshot }} className={\`\${bg} \${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.system_qty_at_start }} className={\`\${bg} \${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.counted_qty }} className={\`\${bg} \${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.final_difference }} className={\`\${bg} \${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.status }} className={\`\${bg} \${cellBorder} \${rowBorder}\`}>&nbsp;</td>
                  <td style={{ width: columnWidths.hide }} className={\`\${bg} \${rowBorder}\`}>&nbsp;</td>
                </tr>
              );
            })
          }`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync(path, code);
console.log('Patched successfully');

import fs from 'fs';
const lines = fs.readFileSync('src/components/EA14Viewer.tsx', 'utf8').split('\n');
const goodLines = lines.slice(0, 240);
const tail = [
  '                              <div className="text-center pt-2 pb-1">',
  '                                <span',
  '                                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 select-none cursor-pointer font-medium"',
  '                                  onClick={(e) => {',
  '                                    e.stopPropagation();',
  '                                    setExpandedUf(null);',
  '                                  }}',
  '                                >',
  '                                  Ocultar detalhes',
  '                                </span>',
  '                              </div>',
  '                            </div>',
  '                          )}',
  '                        </div>',
  '                      );',
  '                    })}',
  '                </div>',
  '              )}',
  '            </div>',
  '          ) : (',
  '            <div className="text-center text-gray-500 py-8">Nenhum dado encontrado para esta eleição.</div>',
  '          )}',
  '        </div>',
  '      </div>',
  '    </>',
  '  );',
  '}'
];
fs.writeFileSync('src/components/EA14Viewer.tsx', goodLines.concat(tail).join('\n'));

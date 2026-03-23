/**
 * Funções utilitárias puras para parseamento de dados originados do TSE.
 */

/**
 * Converte strings que representam inteiros (podendo estar nulas/vazias) em numbers seguros.
 * @param val Valor vindo do JSON (ex: "142")
 * @returns {number} O inteiro convertido (fallback 0)
 */
export const parseNum = (val: any): number => parseInt(val || '0', 10) || 0;

/**
 * Converte strings de percentual do padrão brasileiro ("100,00" ou "5,20") para floats compatíveis computacionalmente.
 * @param val Valor string vindo do JSON (ex: "45,30")
 * @returns {number} O float convertido (fallback 0)
 */
export const parsePct = (val: any): number => parseFloat((val || '0').replace(',', '.')) || 0;

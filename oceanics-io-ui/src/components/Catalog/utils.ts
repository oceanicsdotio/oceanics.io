type ColumnLogicType = {
    expand: boolean;
    mobile: boolean;
    column: number;
}

/**
 * Logical combinator to calculate visibility and style of columns.
 */
export const columnSize = ({ expand, mobile, column }: ColumnLogicType): number => {
    if (column === 0) {
        return !expand ? 1 : 0;
    } else if (column === 1) {
        return (expand || !mobile) ? 6 : 0;
    } else if (column === 2) {
        return !expand ? 3 : 0;
    } else {
        return 0;
    }
};
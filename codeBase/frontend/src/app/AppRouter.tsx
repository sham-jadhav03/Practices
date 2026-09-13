import {Route, Routes} from 'react-router-dom'
import InputURL from "../features/analysis/page/InputURL"

export const AppRouter= () => {
    return (
        <>
        <Routes>
           <Route path="/" element={<InputURL />} />
        </Routes>
        </>
    )
}
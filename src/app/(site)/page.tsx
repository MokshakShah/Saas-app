import TitleSection from '@/components/landing-page/title-section'
import React from 'react'

const HomePage = () => {
  return (
   <section>
    <div className='overflow-hidden px-4 sm:px-6 mt-10 sm:flex sm flex-col gap-4 md-justify-center md:items-center'>
      <TitleSection pill='✨Your Workspace, Perfected' title='Welcome to Your Workspace' subheading='The ultimate solution for productivity and collaboration.' />
      <div className='bg-white p-[2px] mt-[6] rounded-xl bg-gradient-to-r from-primary to-brand-primaryBlue sm:w-[300px]'>

      </div>
    </div>
   </section>
  )
}

export default HomePage
